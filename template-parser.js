import * as fs from "node:fs"
import { Buffer } from "node:buffer"
import Ajv from "ajv"
import fetch from "node-fetch"
import { parse, stringify, YAMLError } from "yaml"
import { writeFile } from "node:fs"

const schemaLocation = 'https://raw.githubusercontent.com/elmsln/kraxen/main/keycloak-deploy.schema.json'

export async function validateTemplate(template) {
    let res = await fetch(schemaLocation)
    const schema = await res.json()

    const validator = new Ajv({strict: "log"})
    const validate = validator.compile(schema)
    return validate(template)
}

export function parseTemplate(templatePath) {
    let template = fs.readFileSync(templatePath, 'utf8')
    return parse(template)
}

export function buildTemplate(values) {
    // builds a yaml template based on CLI, save to filesystem.
    const template = stringify(values)  
    const data = new Uint8Array(Buffer.from(template))
    writeFile('keycloak-client.template.yaml', data, (err) => {
        if (err) throw err
    })
}