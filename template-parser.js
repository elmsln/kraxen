const { fs } = require("node:fs")
const { Buffer } = require("node:buffer")
const { Ajv } = require("ajv")
const { fetch } = import("node-fetch")
const { parse, stringify, YAMLError } = require("yaml")

const schemaLocation = 'https://raw.githubusercontent.com/elmsln/kraxen/main/keycloak-deploy.schema.json'

const validateTemplate = async function validateTemplate(template) {
    let res = await fetch(schemaLocation)
    const schema = await res.json()

    const validator = new Ajv({strict: "log"})
    const validate = validator.compile(schema)
    return validate(template)
}

const parseTemplate = function parseTemplate(templatePath) {
    let template = fs.readFileSync(templatePath, 'utf8')
    return parse(template)
}

const buildTemplate = function buildTemplate(values) {
    // builds a yaml template based on CLI, save to filesystem.
    const template = stringify(values)  
    const data = new Uint8Array(Buffer.from(template))
    fs.writeFile('keycloak-client.template.yaml', data, (err) => {
        if (err) throw err
    })
}

module.exports = {
    validateTemplate,
    parseTemplate,
    buildTemplate
}