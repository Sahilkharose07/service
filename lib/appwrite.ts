import { Client, Account, Databases, Storage } from 'react-native-appwrite';

const client = new Client()
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('681b300f0018fdc27bdd')
    .setPlatform('com.test.servicevale');

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

