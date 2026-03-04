"""
import_csv_to_db_v2.py — Importa CSVs con deduplicación automática de equipos

Mejoras vs v1:
  - Normaliza nombres de equipos antes de buscar/crear (quita acentos, lowercase, etc.)
  - Detecta y fusiona equipos duplicados automáticamente
  - Usa una tabla de alias para mapear nombres alternativos

Uso:
  python import_csv_to_db_v2.py --folder "C:\\ruta\\data"
"""

import argparse
import glob
import os
import re
import unicodedata
import pandas as pd
import psycopg2
from datetime import datetime
from dotenv import load_dotenv

parser = argparse.ArgumentParser()
parser.add_argument("--folder", required=True)
args = parser.parse_args()

env_path = os.path.join(os.path.dirname(__file__), "..", "backend", ".env")
load_dotenv(env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ No se encontró DATABASE_URL en backend/.env")
    exit(1)

conn = psycopg2.connect(DATABASE_URL)
cur  = conn.cursor()

print("\n============================================")
print("  IMPORTAR CSVs v2 — Con deduplicación")
print("============================================\n")

# ─── Normalización de nombres ─────────────────────────────────────
def normalize(name: str) -> str:
    """
    Normaliza un nombre de equipo para comparación:
    - Quita acentos
    - Lowercase
    - Quita palabras comunes (FC, CF, SC, AC, etc.)
    - Quita espacios extra
    """
    if not name:
        return ""
    # Quitar acentos
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    # Lowercase
    name = name.lower().strip()
    # Quitar sufijos/prefijos comunes
    removals = [
        r"\bfc\b", r"\bcf\b", r"\bsc\b", r"\bac\b", r"\bbc\b",
        r"\bfk\b", r"\bsk\b", r"\bif\b", r"\bbk\b", r"\bik\b",
        r"\bunited\b", r"\bcity\b", r"\bsporting\b",
        r"\bclub\b", r"\bde\b", r"\bdel\b", r"\bla\b", r"\blos\b",
    ]
    for pattern in removals:
        name = re.sub(pattern, "", name)
    # Quitar caracteres no alfanuméricos
    name = re.sub(r"[^a-z0-9\s]", "", name)
    # Quitar espacios extra
    name = re.sub(r"\s+", " ", name).strip()
    return name

# Alias manuales para casos especiales conocidos
TEAM_ALIASES = {
    "vallecano":        "rayo vallecano",
    "atletico madrid":  "atletico de madrid",
    "ath madrid":       "atletico de madrid",
    "atletico":         "atletico de madrid",
    "man united":       "manchester united",
    "man utd":          "manchester united",
    "man city":         "manchester city",
    "spurs":            "tottenham hotspur",
    "tottenham":        "tottenham hotspur",
    "wolves":           "wolverhampton wanderers",
    "west brom":        "west bromwich albion",
    "sheffield utd":    "sheffield united",
    "sheffield weds":   "sheffield wednesday",
    "brighton":         "brighton hove albion",
    "forest":           "nottingham forest",
    "newcastle":        "newcastle united",
    "west ham":         "west ham united",
    "leeds":            "leeds united",
    "brentford":        "brentford",
    "inter":            "inter milan",
    "milan":            "ac milan",
    "juventus":         "juventus",
    "napoli":           "napoli",
    "lazio":            "lazio",
    "roma":             "as roma",
    "fiorentina":       "fiorentina",
    "atalanta":         "atalanta",
    "verona":           "hellas verona",
    "psg":              "paris saint germain",
    "paris sg":         "paris saint germain",
    "marseille":        "olympique marseille",
    "lyon":             "olympique lyonnais",
    "monaco":           "as monaco",
    "lille":            "losc lille",
    "betis":            "real betis",
    "sevilla":          "sevilla",
    "villarreal":       "villarreal",
    "sociedad":         "real sociedad",
    "osasuna":          "osasuna",
    "celta":            "celta vigo",
    "espanyol":         "espanyol",
    "getafe":           "getafe",
    "girona":           "girona",
    "alaves":           "deportivo alaves",
    "mallorca":         "mallorca",
    "las palmas":       "ud las palmas",
    "cadiz":            "cadiz",
    "granada":          "granada",
    "almeria":          "ud almeria",
    "leverkusen":       "bayer leverkusen",
    "dortmund":         "borussia dortmund",
    "m gladbach":       "borussia monchengladbach",
    "monchengladbach":  "borussia monchengladbach",
    "frankfurt":        "eintracht frankfurt",
    "hoffenheim":       "tsg hoffenheim",
    "stuttgart":        "vfb stuttgart",
    "augsburg":         "fc augsburg",
    "freiburg":         "sc freiburg",
    "mainz":            "1 fsv mainz 05",
    "werder":           "werder bremen",
    "bremen":           "werder bremen",
    "leipzig":          "rb leipzig",
}

def canonical_name(name: str) -> str:
    n = normalize(name)
    return TEAM_ALIASES.get(n, n)

# ─── Cache de equipos (nombre normalizado → id) ───────────────────
team_cache: dict[str, int] = {}

def load_team_cache():
    cur.execute('SELECT id, name FROM "Team"')
    for tid, tname in cur.fetchall():
        key = canonical_name(tname)
        team_cache[key] = tid
    print(f"   Cache cargado: {len(team_cache)} equipos\n")

def get_or_create_team(name: str) -> int:
    key = canonical_name(name)
    if key in team_cache:
        return team_cache[key]
    # Crear nuevo equipo
    api_id = abs(hash(name)) % 2147483647
    # Asegurar apiId único
    cur.execute('SELECT id FROM "Team" WHERE "apiId" = %s', (api_id,))
    if cur.fetchone():
        api_id = api_id + abs(hash(key)) % 1000
    cur.execute(
        'INSERT INTO "Team" ("apiId", name) VALUES (%s, %s) RETURNING id',
        (api_id, name.strip())
    )
    tid = cur.fetchone()[0]
    team_cache[key] = tid
    return tid

# ─── Helpers ──────────────────────────────────────────────────────
league_cache: dict[tuple, int] = {}
season_cache: dict[tuple, int] = {}

def get_or_create_league(name: str, country: str) -> int:
    key = (name.lower(), country.lower())
    if key in league_cache:
        return league_cache[key]
    cur.execute('SELECT id FROM "League" WHERE name = %s AND country = %s', (name, country))
    row = cur.fetchone()
    if row:
        league_cache[key] = row[0]
        return row[0]
    cur.execute(
        'INSERT INTO "League" ("apiId", name, country) VALUES (%s, %s, %s) RETURNING id',
        (abs(hash(name + country)) % 2147483647, name, country)
    )
    lid = cur.fetchone()[0]
    league_cache[key] = lid
    return lid

def get_or_create_season(year: str, league_id: int) -> int:
    key = (year, league_id)
    if key in season_cache:
        return season_cache[key]
    cur.execute('SELECT id FROM "Season" WHERE year = %s AND "leagueId" = %s', (year, league_id))
    row = cur.fetchone()
    if row:
        season_cache[key] = row[0]
        return row[0]
    cur.execute(
        'INSERT INTO "Season" (year, "leagueId") VALUES (%s, %s) RETURNING id',
        (year, league_id)
    )
    sid = cur.fetchone()[0]
    season_cache[key] = sid
    return sid

def match_exists(home_id: int, away_id: int, date) -> bool:
    cur.execute(
        'SELECT id FROM "Match" WHERE "homeTeamId" = %s AND "awayTeamId" = %s AND date = %s',
        (home_id, away_id, date)
    )
    return cur.fetchone() is not None

def safe_int(val):
    try:
        v = float(val)
        if pd.isna(v): return None
        return int(v)
    except:
        return None

LEAGUE_MAP = {
    "E0":  ("Premier League",   "England"),
    "E1":  ("Championship",     "England"),
    "E2":  ("League 1",         "England"),
    "E3":  ("League 2",         "England"),
    "EC":  ("Conference",       "England"),
    "SP1": ("La Liga",          "Spain"),
    "SP2": ("La Liga 2",        "Spain"),
    "D1":  ("Bundesliga",       "Germany"),
    "D2":  ("2. Bundesliga",    "Germany"),
    "I1":  ("Serie A",          "Italy"),
    "I2":  ("Serie B",          "Italy"),
    "F1":  ("Ligue 1",          "France"),
    "F2":  ("Ligue 2",          "France"),
    "N1":  ("Eredivisie",       "Netherlands"),
    "P1":  ("Primeira Liga",    "Portugal"),
    "SC0": ("Premiership",      "Scotland"),
    "B1":  ("Pro League",       "Belgium"),
    "T1":  ("Süper Lig",        "Turkey"),
    "G1":  ("Super League",     "Greece"),
    "ARG": ("Primera Division", "Argentina"),
    "BRA": ("Serie A",          "Brazil"),
}

# ─── Cargar cache inicial ─────────────────────────────────────────
load_team_cache()

# ─── Procesar CSVs ────────────────────────────────────────────────
csv_files = glob.glob(os.path.join(args.folder, "*.csv"))
print(f"📄 CSVs encontrados: {len(csv_files)}\n")

total_inserted = 0
total_skipped  = 0
total_errors   = 0

for filepath in csv_files:
    filename = os.path.basename(filepath)
    print(f"📂 {filename}")

    try:
        try:
            df = pd.read_csv(filepath, encoding="utf-8", on_bad_lines="skip")
        except UnicodeDecodeError:
            df = pd.read_csv(filepath, encoding="latin-1", on_bad_lines="skip")

        df = df.dropna(how="all")

        div = df["Div"].dropna().iloc[0] if "Div" in df.columns else "??"
        league_name, country = LEAGUE_MAP.get(div, (f"Liga {div}", "World"))

        if "Date" in df.columns:
            try:
                sample_date = pd.to_datetime(df["Date"].dropna().iloc[0], dayfirst=True)
                year = str(sample_date.year)
            except:
                year = "2025"
        else:
            year = "2025"

        league_id = get_or_create_league(league_name, country)
        season_id = get_or_create_season(year, league_id)
        conn.commit()

        inserted = 0
        skipped  = 0

        for _, row in df.iterrows():
            try:
                if pd.isna(row.get("HomeTeam")) or pd.isna(row.get("AwayTeam")):
                    continue
                if pd.isna(row.get("FTHG")) or pd.isna(row.get("FTAG")):
                    continue

                try:
                    match_date = pd.to_datetime(row["Date"], dayfirst=True)
                except:
                    continue

                home_id = get_or_create_team(str(row["HomeTeam"]).strip())
                away_id = get_or_create_team(str(row["AwayTeam"]).strip())

                if match_exists(home_id, away_id, match_date):
                    skipped += 1
                    continue

                home_goals = safe_int(row.get("FTHG"))
                away_goals = safe_int(row.get("FTAG"))

                api_id = abs(hash(f"{row['HomeTeam']}{row['AwayTeam']}{match_date}")) % 2147483647
                cur.execute('SELECT id FROM "Match" WHERE "apiId" = %s', (api_id,))
                if cur.fetchone():
                    api_id += 1

                cur.execute(
                    '''INSERT INTO "Match"
                       ("apiId","seasonId","homeTeamId","awayTeamId",date,status,"homeGoals","awayGoals")
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id''',
                    (api_id, season_id, home_id, away_id, match_date, "FT", home_goals, away_goals)
                )
                match_id = cur.fetchone()[0]

                home_shots   = safe_int(row.get("HS"))
                away_shots   = safe_int(row.get("AS"))
                home_sot     = safe_int(row.get("HST"))
                away_sot     = safe_int(row.get("AST"))
                home_corners = safe_int(row.get("HC"))
                away_corners = safe_int(row.get("AC"))
                home_fouls   = safe_int(row.get("HF"))
                away_fouls   = safe_int(row.get("AF"))
                home_yellow  = safe_int(row.get("HY"))
                away_yellow  = safe_int(row.get("AY"))

                if any(v is not None for v in [home_shots, away_shots, home_corners, away_corners]):
                    cur.execute(
                        '''INSERT INTO "MatchStats"
                           ("matchId","homeShots","awayShots","homeShotsOnTarget","awayShotsOnTarget",
                            "homeCorners","awayCorners","homeFouls","awayFouls",
                            "homeYellowCards","awayYellowCards")
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)''',
                        (match_id, home_shots, away_shots, home_sot, away_sot,
                         home_corners, away_corners, home_fouls, away_fouls,
                         home_yellow, away_yellow)
                    )

                inserted += 1

            except Exception as e:
                total_errors += 1
                if total_errors <= 5:
                    print(f"   ⚠️  Error fila: {e}")
                conn.rollback()
                try:
                    league_id = get_or_create_league(league_name, country)
                    season_id = get_or_create_season(year, league_id)
                    conn.commit()
                except:
                    pass
                continue

        conn.commit()
        total_inserted += inserted
        total_skipped  += skipped
        print(f"   ✅ {inserted} insertados, {skipped} ya existían\n")

    except Exception as e:
        print(f"   ❌ Error: {e}\n")
        conn.rollback()

cur.close()
conn.close()

print("============================================")
print(f"  ✅ IMPORTACIÓN COMPLETADA")
print(f"  Insertados : {total_inserted}")
print(f"  Ya existían: {total_skipped}")
print(f"  Errores    : {total_errors}")
print("============================================")