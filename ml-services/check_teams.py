import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute(
    """
    SELECT id, name FROM "Team" 
    WHERE name ILIKE '%rayo%' 
       OR name ILIKE '%vallecano%' 
       OR name ILIKE '%oviedo%'
       OR name ILIKE '%sevilla%'
       OR name ILIKE '%barcelona%'
       OR name ILIKE '%madrid%'
"""
)
print("Equipos encontrados:")
for r in cur.fetchall():
    print(f"  ID {r[0]}: {r[1]}")

# También muestra los partidos de hoy que tienen data real
cur.execute(
    """
    SELECT DISTINCT t.name 
    FROM "Match" m
    JOIN "Team" t ON t.id = m."homeTeamId" OR t.id = m."awayTeamId"
    WHERE m.status != 'FT'
    LIMIT 20
"""
)
print("\nEquipos en partidos de hoy (sin FT):")
for r in cur.fetchall():
    print(f"  {r[0]}")
cur.execute(
    """
    SELECT id, name FROM "Team" 
    WHERE name ILIKE '%manchester%' 
       OR name ILIKE '%newcastle%'
       OR name ILIKE '%nottingham%'
       OR name ILIKE '%forest%'
"""
)
print("Equipos encontrados:")
for r in cur.fetchall():
    print(f"  ID {r[0]}: {r[1]}")

cur.execute("""
    SELECT id, name FROM "Team" 
    WHERE name ILIKE '%manchester city%' 
       OR name ILIKE '%newcastle%' 
       OR name ILIKE '%nottingham%'
       OR name ILIKE '%man city%'
""")
print("Manchester/Newcastle/Nottingham:")
for r in cur.fetchall():
    print(f"  ID {r[0]}: {r[1]}")

cur.close()
conn.close()
