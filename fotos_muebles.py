from supabase import create_client
import os

url = "https://fwhjzjqkvfdsezfgpqdi.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGp6anFrdmZkc2V6ZmdwcWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjY2MTMsImV4cCI6MjA4Nzc0MjYxM30.1MLuKDs61KF1XqOBdp_TFmOK6taP3pbOpsro75zA_rI"
bucket = "fotos_muebles"

supabase = create_client(url, key)

# Listar todos los archivos
files = supabase.storage.from_(bucket).list()

# Descargar cada uno
os.makedirs("descargas", exist_ok=True)
for file in files:
    nombre = file['name']
    data = supabase.storage.from_(bucket).download(nombre)
    with open(f"descargas/{nombre}", "wb") as f:
        f.write(data)
    print(f"Descargado: {nombre}")