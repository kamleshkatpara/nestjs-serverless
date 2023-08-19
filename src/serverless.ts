import { NestFactory } from '@nestjs/core';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { FastifyServerOptions, FastifyInstance, fastify } from 'fastify';
import awsLambdaFastify from '@fastify/aws-lambda';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from '@nestjs/common';

interface NestApp {
    app: NestFastifyApplication;
    instance: FastifyInstance;
}

let cachedNestApp: NestApp;

async function bootstrap(): Promise<NestApp> {
    const serverOptions: FastifyServerOptions = { logger: true };
    const instance: FastifyInstance = fastify(serverOptions);
    const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(instance), {
        logger: !process.env.AWS_EXECUTION_ENV ? new Logger() : console
    });
    await app.init();
    return { app, instance };
}

export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context,
): Promise<APIGatewayProxyResult> => {
    if (!cachedNestApp) {
        cachedNestApp = await bootstrap();
    }
    const proxy = awsLambdaFastify(cachedNestApp.instance);

    return proxy(event, context);
};