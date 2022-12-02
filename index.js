#!/usr/bin/env node

import { ArgumentParser } from 'argparse'
import { Keycloak } from "./keycloak.js"
import * as dotenv from 'dotenv'
import { buildTemplate, parseTemplate, validateTemplate } from "./template-parser.js"

// Driver for kraxen CLI

// Set up Arguments
const parser = new ArgumentParser({
    description: "KRAXEN🦑 -- Infrastructure as Code for Keycloak"
})
parser.add_argument('-t', '--template', { help: 'Specify a template to deploy' });

const args = parser.parse_args()

// For config-- check if dotenv exists- if not, use env vars. If errors, alert in CLI.
// Get user information
// TODO: Add way to pass in dotenv (maybe .kconfig)
dotenv.config()

// Get template path and parse template
// TODO: Check that path actually exists and inst fake
if ('template' in args){
    const templatePath = args.template
    const templateData = parseTemplate(templatePath)
    const isValid = validateTemplate(templateData)

    if (isValid){
        const confData = templateData.keycloak
        const clientData = flattenObject(templateData.client)
        const clientRequestBody = representClient(clientData)
        const kc = new Keycloak(confData.realm)

        // Check if client exists, if it does, update it.
        const clientList = await kc.getClientList()
        for (const client of clientList){
            if (client.clientId == clientData.clientId){
                const clientUuid = client.id
                let status = await kc.updateClient(clientUuid, clientRequestBody)
                console.log("Updating Client...")
                if (status == 204 || status == 200){
                    console.log("Client Updated Successfully ✅")
                    process.exit(0)
                } else {
                    console.error("Uh Oh! The client could not be updated ❌")
                    process.exit(1)
                }
            }
        }

        // Client does not exist yet, we need to create it.
        let status = await kc.createClient(clientRequestBody)
        console.log("Creating Client...")
        if (status == 201 || status == 204 || status == 200){
            console.log("Client Created Successfully ✅")
            process.exit(0)
        } else {
            console.error("Uh Oh! The client could not be created ❌")
            process.exit(1)
        }
        
    } else {
        console.error("Provided template contains errors that must be fixed before proceeding 🌪")
        process.exit(1)
    }
}



// NEED to exfiltrate the "smart defaults bit into separate function for use by CLI"

function flattenObject(ob){
    let result = {};
    // loop through the object "ob"
    for (const i in ob) {
        // We check the type of the i using
        // typeof() function and recursively
        // call the function again
        if ((typeof ob[i]) === 'object' && !Array.isArray(ob[i])) {
            const temp = flattenObject(ob[i]);
            for (const j in temp) {
                // Store temp in result
                result[j] = temp[j];
            }
        }
        // Else store ob[i] in result directly
        else {
            result[i] = ob[i];
        }
    }
    return result;
}

function representClient(clientData){
    let clientRepresentation = {}
            
    // Loop through list of keys- if in template data, use template value. Else, use smart default value.
    const configOptions = [
        'adminUrl',
        'alwaysDisplayInConsole',
        'authenticationFlowBindingOverrides',
        'authorizationServicesEnabled',
        'authorizationSettings',
        'baseUrl',
        'bearerOnly',
        'clientAuthenticatorType',
        'clientId',
        'consentRequired',
        'defaultClientScopes',
        'description',
        'directAccessGrantsEnabled',
        'enabled',
        'frontchannelLogout',
        'fullScopeAllowed',
        'id',
        'implicitFlowEnabled',
        'name',
        'oauth2DeviceAuthorizationGrantEnabled',
        'optionalClientScopes',
        'origin',
        'protocol',
        'protocolMappers',
        'publicClient',
        'redirectUris',
        'registeredNodes',
        'registrationAccessToken',
        'rootUrl',
        'secret',
        'serviceAccountsEnabled',
        'standardFlowEnabled',
        'surrogateAuthRequired',
        'webOrigins'
    ]

    const smartDefaults = {
        access: { view: true, configure: true, manage: true },
        alwaysDisplayInConsole: false,
        authorizationServicesEnabled: false,
        bearerOnly: false,
        clientAuthenticatorType: 'client-secret',
        consentRequired: false,
        defaultClientScopes: [ 'web-origins', 'acr', 'roles', 'profile', 'email' ],
        directAccessGrantsEnabled: false,
        enabled: true,
        frontchannelLogout: true,
        fullScopeAllowed: true,
        implicitFlowEnabled: false,
        optionalClientScopes: [ 'address', 'phone', 'offline_access', 'microprofile-jwt' ],
        publicClient: true,
        serviceAccountsEnabled: false,
        standardFlowEnabled: true,
        surrogateAuthRequired: false,
    }

    for (let key of configOptions){
        if(clientData[key] != undefined){
            clientRepresentation[key] = clientData[key]
        } else if (smartDefaults[key] != undefined){
            clientRepresentation[key] = smartDefaults[key]
        }
    }
    return clientRepresentation
}
