import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM "Match"')
print("Total partidos:", cur.fetchone()[0])

cur.execute("SELECT COUNT(*) FROM \"Match\" WHERE status = 'FT'")
print("Partidos FT:", cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM "MatchStats"')
print("MatchStats:", cur.fetchone()[0])

cur.execute("""
    SELECT COUNT(*) FROM "Match" m 
    INNER JOIN "MatchStats" ms ON ms."matchId" = m.id 
    WHERE m.status = 'FT'
""")
print("Partidos FT con stats:", cur.fetchone()[0])

cur.execute('SELECT COUNT(*) FROM "Team"')
print("Equipos:", cur.fetchone()[0])

cur.close()
conn.close()