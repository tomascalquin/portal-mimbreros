import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fwhjzjqkvfdsezfgpqdi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aGp6anFrdmZkc2V6ZmdwcWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjY2MTMsImV4cCI6MjA4Nzc0MjYxM30.1MLuKDs61KF1XqOBdp_TFmOK6taP3pbOpsro75zA_rI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function exportAllData() {
    try {
        const tables = ['tiendas', 'productos', 'compras', 'entidades_bancarias', 'artesanos', 'articulos_maestro', 'registro_compras', 'ventas', 'categorias']
        const data = {}

        for (const table of tables) {
            const { data: tableData, error } = await supabase
                .from(table)
                .select('*')

            if (error) {
                console.log(`Error en ${table}:`, error.message)
            } else {
                data[table] = tableData
                console.log(`✓ ${table}: ${tableData.length} registros`)
            }
        }

        const fs = await import('fs')
        fs.writeFileSync('export.json', JSON.stringify(data, null, 2))
        console.log('✅ Datos exportados a export.json')
    } catch (err) {
        console.error('Error:', err)
    }
}

exportAllData()