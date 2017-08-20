export interface ApiGatewayEvent {
    body: string,
    resource: string,
    queryStringParameters: {[key: string]: string},
    headers: {[key: string]: string},
    pathParameters: {[key: string]: string},
    httpMethod: string,
    path: string
}

export interface ApiGatewayResponse {
    statusCode: number,
    headers: {[keys: string]: any},
    body: string
}

export interface ApiGatewayContext {
    done: (error:Error, response: ApiGatewayResponse) => void;
}