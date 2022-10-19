import * as fs from "node:fs"
import Ajv from "ajv"
import fetch from "node-fetch"
import { parse, stringify, YAMLError } from "yaml"

const schemaLocation = 'https://raw.githubusercontent.com/elmsln/kraxen/main/keycloak-deploy.schema.json'

export async function validateTemplate(template) {
    // use ajv https://ajv.js.org/

    let res = await fetch(schemaLocation)
    const schema = await res.json()

    const validator = new Ajv({strict: "log"})
    const validate = validator.compile(schema)
    return validate(template)

}

export function parseTemplate(templatePath) {
    // use yaml https://www.npmjs.com/package/yaml

    let template = fs.readFileSync(templatePath, 'utf8')
    return parse(template)
}

export function buildTemplate() {
    // build a yaml template based on CLI, save to filesystem.
}