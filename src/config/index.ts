import dotenv from 'dotenv';
dotenv.config();

export interface ILoggerConfig {
  logLevel: string;
}

export const config: ILoggerConfig = {
  logLevel: process.env.APPLICATION_LOG_LEVEL || 'debug'
};

console.log(`Config: ${JSON.stringify(config)}`);
