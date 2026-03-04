import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# (ID a mantener = API, ID a eliminar = CSV)
MERGES = [
    (15203, 14592),  # Newcastle (API) ← Newcastle (CSV)
    (15096, 14594),  # Nottingham Forest (API) ← Nott'm Forest (CSV)
    (15095, 78),     # Manchester City (API) ← Manchester City U18 (CSV) — revisar
    (14911, 14498),  # Rayo Vallecano (API) ← Vallecano (CSV)
    (14912, 14500),  # Oviedo (API) ← Oviedo (CSV)
    (573,   14511),  # Atletico Madrid ← Ath Madrid
    (572,   14644),  # Barcelona ← Barcelona SC — revisar
    (15095, 14599),  # Manchester City (API) ← Man City (CSV)
]

for keep_id, remove_id in MERGES:
    cur.execute('SELECT name FROM "Team" WHERE id = %s', (keep_id,))
    keep = cur.fetchone()
    cur.execute('SELECT name FROM "Team" WHERE id = %s', (remove_id,))
    remove = cur.fetchone()
    
    if not keep or not remove:
        print(f"⚠️  ID {keep_id} o {remove_id} no existe, saltando")
        continue
    
    print(f"Fusionando '{remove[0]}' ({remove_id}) → '{keep[0]}' ({keep_id})")
    
    cur.execute('UPDATE "Match" SET "homeTeamId" = %s WHERE "homeTeamId" = %s', (keep_id, remove_id))
    cur.execute('UPDATE "Match" SET "awayTeamId" = %s WHERE "awayTeamId" = %s', (keep_id, remove_id))
    cur.execute('DELETE FROM "Team" WHERE id = %s', (remove_id,))
    print(f"  ✅ Listo")

conn.commit()

# Verificar resultado
print("\nVerificando equipos Premier League:")
cur.execute("""
    SELECT id, name FROM "Team" 
    WHERE name ILIKE '%manchester%' 
       OR name ILIKE '%newcastle%'
       OR name ILIKE '%nottingham%'
       OR name ILIKE '%forest%'
""")
for r in cur.fetchall():
    print(f"  ID {r[0]}: {r[1]}")

cur.close()
conn.close()
print("\n✅ Fusión completada")