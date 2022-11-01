import fetch from "node-fetch"

export class Keycloak {
    // keycloak class will serve as SDK for conducting operations within the keycloak deployment
    // keycloakHost should be the FQDN of the host and port ONLY, e.g., keycloak.example.com or keycloak.example.com:8080 -- should add handing to ensure that the class can handle either format and/or the url is in the right format.
    // keycloak does not provide a native way to grab API keys for their REST API- must use username and password authentication.

    #keycloakHost
    #keycloakRealm
    #keycloakAdminUsername
    #keycloakAdminPassword
    #keycloakToken
    #keycloakRefreshToken

    //update with optional parameters
    constructor(keycloakRealm, {keycloakHost, keycloakUsername, keycloakPassword} ) {
        try {
            if (keycloakHost){
                this.#keycloakHost = keycloakHost
            } else {
                this.#keycloakHost = process.env('KEYCLOAK_HOST')
            }
            if (keycloakUsername){ // change to username and password
                this.#keycloakAdminUsername = keycloakUsername
            } else {
                this.#keycloakAdminUsername = process.env('KEYCLOAK_ADMIN_USERNAME')
            }
            if (keycloakPassword) {
                this.#keycloakAdminPassword = keycloakPassword
            } else {
                this.#keycloakAdminPassword = process.env('KEYCLOAK_ADMIN_PASSWORD')
            }
            if (keycloakRealm){
                this.#keycloakRealm = keycloakRealm
            } else {
                this.#keycloakRealm = process.env('KEYCLOAK_REALM')
            }
        } catch (error) {
            console.error("ERROR: Must specifiy keycloak configuration in object declaration or environment variables.")
            process.exit(1)
        }
    }

    // each method should have a "InitTokens" method call that checks if we have a token, if not generate it, try to make a call,
    // if we get 403 then we need to use refresh token. 

    // Gets details about a specific keycloak realm
    async getRealm() {
        const token = await this.#initTokens()
        const endpointUrl = `https://${this.#keycloakHost}/admin/realms/${this.#keycloakRealm}/`
        const httpMethod = 'GET'

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${token}`}})
        if (res.status == 403){
            let newToken = this.#refreshToken(this.#keycloakRefreshToken, this.#keycloakHost)
            res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${newToken}`}})
        }
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak request: ' + message)
        }
        let data = await res.json()
        return data
    }
    
    // Gets details about each keycloak client
    async getClientList(){
        const token = await this.#initTokens()
        const endpointUrl = `https://${this.#keycloakHost}/admin/realms/${this.#keycloakRealm}/clients/`
        const httpMethod = 'GET'

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${token}`}})        
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak request: ' + message)
        }
        let data = await res.json()
        return data 
    }

    // Need to add error handling for when items are not found
    // Gets details about a specific keycloak client
    async getClient(clientId){
        const token = await this.#initTokens()
        const endpointUrl = `https://${this.#keycloakHost}/admin/realms/${this.#keycloakRealm}/clients/${clientId}`
        const httpMethod = 'GET'

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${token}`}})
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak request: ' + message)
        }
        let data = await res.json()
        return data
    }

    // create a new keycloak client
    async createClient(clientConfiguration){
        const token = await this.#initTokens()
        const endpointUrl = `https://${this.#keycloakHost}/admin/realms/${this.#keycloakRealm}/clients/`
        const httpMethod = 'POST'
        const formBody = this.#encodeBody(clientConfiguration)

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: formBody})
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak request: ' + message)
        }
        let data = await res.json()
        //return data
        console.log(data)
    }

    // Update the configuration for a keycloak client
    // Note, the clientID is the ID of the client (uuid) not the standard ClientId
    async updateClient(clientId, clientConfiguration){
        const token = await this.#initTokens()
        const endpointUrl = `https://${this.#keycloakHost}/admin/realms/${this.#keycloakRealm}/clients/${clientId}`
        const httpMethod = 'PUT'
        const formBody = this.#encodeBody(clientConfiguration)

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Authorization": `bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: formBody})
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak request: ' + message)
        }
        let data = await res.json()
        //return data
        console.log(data)
    }

    // Encodes objects in the appropriate body format
    #encodeBody(bodyData) {
        var formBody = [];
        for (var property in bodyData) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(bodyData[property]);
        formBody.push(encodedKey + "=" + encodedValue);
        }
        formBody = formBody.join("&");
        return formBody
    }

    // checks for a token, if none exists, then go fetch it. Returns the access token.
    async #initTokens() {
        if (this.#keycloakToken) {
            return this.#keycloakToken
        }
        try {
            let tokenResponse = await this.#getToken(this.#keycloakAdminUsername, this.#keycloakAdminPassword, this.#keycloakHost)
            this.#keycloakToken = tokenResponse.access_token
            this.#keycloakRefreshToken = tokenResponse.refresh_token
            return tokenResponse.access_token
        } catch (error) {
            console.error("ERROR: Could not authenticate keycloak client")
            process.exit(1)
        }
        
    }

    // https://stackoverflow.com/questions/53283281/how-to-activate-the-rest-api-of-keycloak
    // Gets the set of tokens needed for API authentication
    async #getToken(adminUsername, adminPassword, keycloakHost) {
        const endpointUrl = `https://${keycloakHost}/realms/master/protocol/openid-connect/token`
        const httpMethod = 'POST'
        const reqData = {
            "username": adminUsername,
            "password": adminPassword,
            "client_id": "admin-cli",
            "grant_type": "password",
        }
        let formBody = this.#encodeBody(reqData)

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: formBody})
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak authentication request: ' + message)
        }
        let data = await res.json()
        return data
    }

    // https://stackoverflow.com/questions/51386337/refresh-access-token-via-refresh-token-in-keycloak
    // Gets a new access token given an existing refresh token
    async #refreshToken(refreshToken, keycloakHost) {
        const endpointUrl = `https://${keycloakHost}/realms/master/protocol/openid-connect/token`
        const httpMethod = 'POST'
        const reqData = {
            "refresh_token": refreshToken,
            "client_id": "admin-cli",
            "grant_type": "refresh_token",
        }
        let formBody = this.#encodeBody(reqData)

        let res = await fetch(endpointUrl, {method: httpMethod, headers: {"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}, body: formBody})
        if (!res.ok){
            let message = await res.text()
            throw new Error('Could not complete keycloak authentication request: ' + message)
        }
        let data = await res.json()
        this.#keycloakToken = data.access_token
        return data.access_token
    }
}

