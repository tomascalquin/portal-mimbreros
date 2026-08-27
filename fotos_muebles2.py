from supabase import create_client
import os

url = "https://fwhjzjqkvfdsezfgpqdi.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGp6anFrdmZkc2V6ZmdwcWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjY2MTMsImV4cCI6MjA4Nzc0MjYxM30.1MLuKDs61KF1XqOBdp_TFmOK6taP3pbOpsro75zA_rI"
bucket = "fotos_muebles"

supabase = create_client(url, key)

def descargar_carpeta(carpeta=""):
    files = supabase.storage.from_(bucket).list(carpeta)
    
    for file in files:
        # Si tiene metadata es un archivo, si no es una carpeta
        if file.get("metadata") is not None:
            ruta = f"{carpeta}/{file['name']}" if carpeta else file['name']
            print(f"Descargando: {ruta}")
            
            # Crear carpetas locales si no existen
            os.makedirs(f"descargas/{carpeta}", exist_ok=True)
            
            data = supabase.storage.from_(bucket).download(ruta)
            with open(f"descargas/{ruta}", "wb") as f:
                f.write(data)
        else:
            # Es una subcarpeta, entrar recursivamente
            subcarpeta = f"{carpeta}/{file['name']}" if carpeta else file['name']
            print(f"Entrando a carpeta: {subcarpeta}")
            descargar_carpeta(subcarpeta)

descargar_carpeta()
print("✅ Listo!")