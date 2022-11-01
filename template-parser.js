import {writeFile, readFileSync} from "fs"
import { Buffer } from "node:buffer"
import Ajv from "ajv"
import { parse, stringify} from "yaml"

const schemaPath = './keycloak-deploy.schema.json'

export function validateTemplate(template) {
    let res = readFileSync(schemaPath, 'utf-8')
    const schema = JSON.parse(res)

    const validator = new Ajv({strict: "log"})
    const validate = validator.compile(schema)
    return validate(template)
}

export function parseTemplate(templatePath) {
    let template = readFileSync(templatePath, 'utf8')
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
