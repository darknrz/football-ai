import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

# Borrar TODAS las predicciones guardadas
cur.execute('DELETE FROM "Prediction"')
deleted = cur.rowcount
conn.commit()

print(f"✅ {deleted} predicciones eliminadas")
print("Ahora regenera solo los partidos con historial real desde el frontend")

cur.close()
conn.close()