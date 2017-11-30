const path = require('path')
const { promisify } = require('util')
const readFile = promisify(require('fs').readFile)
const fs = require('fs-promise');

const config = require('../src/config')
const { pool } = require('../src/db/util')


// //////////////////////////////////////////////////////////

function slurpSql(filePath) {
    const relativePath = '../sql/migrations/' + filePath
    const fullPath = path.join(__dirname, relativePath)
    return readFile(fullPath, 'utf8')
}

async function migrate() {
    console.log('Migrating the database...')

    await (async () => {
        const files = await fs.readdir(path.join(__dirname, '../sql/migrations'));
        await Promise.all(files.map(async (file) => {
            const sql = await slurpSql(file)
            console.log(`-- Executing ${file}...`)
            try {
                await pool._query(sql)
                await pool._query(`INSERT INTO migrations (file_id) VALUES (${file.replace('.sql', '')})`)
            } catch(err) {
                console.log(err)
            }
        }));
    })();
}

migrate().then(
    () => {
        console.log('Finished migrating db')
        process.exit(0)
    },
    err => {
        console.error('Error:', err, err.stack)
        process.exit(1)
    }
)
