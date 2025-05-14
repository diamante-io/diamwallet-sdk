
  

<p  align="center">

<img  src="https://play-lh.googleusercontent.com/HM0G9lgsAtzbpkujqhPA86CR04tgzDUOAviER5yARNBlOsqSpamW8ZtjTJ1Snl1yMGJv=w240-h480-rw"  alt="DIAM Wallet Logo"  style="border-radius: 20%; width: 200px; height: 200px;">

</p>

  

# DIAM WALLET

  

## DIAM Wallet SDK

  

The DIAM Wallet SDK allows developers to seamlessly connect their dApps with both web apps (on Android and iOS mobile browsers) through the DIAM Wallet App.

  

<div  align="center">

  

![Platform: iOS](https://img.shields.io/badge/platform-iOS-blue?style=flat-square)

![Platform: Android](https://img.shields.io/badge/platform-Android-green?style=flat-square)

![Platform: Web](https://img.shields.io/badge/platform-Web-orange?style=flat-square)

![License](https://img.shields.io/badge/license-MIT-blue)

![npm version](https://img.shields.io/npm/v/diamwallet-sdk.svg?style=flat-square)

![Build status](https://img.shields.io/github/actions/workflow/status/diamante-io/diamwallet-sdk/ci.yml?branch=main&label=CI&logo=github&style=flat-square)

![code coverage](https://img.shields.io/coveralls/diamante-io/diamwallet-sdk.svg?style=flat-square)

![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=diamwallet-sdk&query=$.install.pretty&label=install%20size&style=flat-square)

![npm bundle size](https://img.shields.io/bundlephobia/minzip/diamwallet-sdk?style=flat-square)

![npm downloads](https://img.shields.io/npm/dm/diamwallet-sdk.svg?style=flat-square)

  

</div>

  

## Getting Started

  

### Installation

  

You can install the DIAM Wallet SDK using npm or yarn:

  

Install the SDK in your Application:

  

```sh

yarn  add  diamwallet-sdk-vite-mobile

```

  

```sh

npm  install  --save  diamwallet-sdk-vite-mobile

```

  
  
  

### Setting Up the SDK in Your Application

  

**Note:** The SDK does not include a wrapper, so it must be initialized in every file where it is used.

  

#### React Web Implementation

  

Install web-vital for web(ReactJS).

  

```sh

npm  i  --save  web-vitals

```

  

```javascript

import React from  'react';

import DIAMWalletConnectionSDK from  'diamwallet-sdk-vite-mobile';

  

const  diamWalletSdk  =  new  DIAMWalletConnectionSDK({

platform: "web",

appCallback: window.location.origin +  "/callback",

appName: "Demo App1",

network: "testnet",

});

```

  

## SDK Methods

  

### 1. Connect Wallet

  

Establishes connection with DIAM Wallet and returns user's wallet address.

  

**Returns:**

  

```typescript

{

status: boolean, // Connection status

address: string, // Wallet address if successful

data?: string // Error message if failed

}

```

  
  

#### React Web

  

```javascript

const  connectWallet  =  async () => {

try {

console.log("Connecting...");

const  result  =  await sdk.connectWallet();

if (result.status ===  true) {

setConnectionStatus(result.status);

setWalletAddress(result.address);

let balanceResponse =  await sdk.getBalance();

setBalance(balanceResponse.data.balance);

}

} catch (error) {

console.error("Failed to connect wallet:", error);

setConnectionStatus(false);

alert(`Failed to connect: \n${error.message}`);

}

};

```

  

### 2. Fetch Wallet Balance

  

Retrieves the current balance of the connected wallet.

  

**Returns:**

  

```typescript

{

status: boolean,

data: {

balance: string

}

}

```

  

```javascript

const  fetchBalance  =  async () => {

let balanceResponse =  await diamWalletSdk.getBalance();

console.log(balanceResponse);

};

```

  

### 3. Send Transaction

  

Sends a new transaction to a specified address.

  

**Parameters:**

  

```typescript

{

amount: string, // Amount to send

toAddress: string, // Recipient address

signTransaction: false  // Must be false for sending

}

```

  

**Returns:**

  

```typescript

{

status: boolean,

data: Array<object>; // Array of generic objects

}

```

  

```javascript

const  sendTransaction  =  async () => {

let transactionData = {

amount: "10", // sending amount

toAddress: "GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY", // receiver address

signTransaction: false,

};

try {

const  result  =  await diamWalletSdk.sendTransaction(transactionData);

console.log(result);

} catch (error) {

console.error('Failed to send transaction:', error);

}

};

```

  

### 4. Sign Transaction

  

Signs a transaction without broadcasting it to the network.

  

**Parameters:**

  

```typescript

{

amount: string, // Amount to send

toAddress: string, // Recipient address

signTransaction: true  // Must be true for signing

}

```

  

**Returns:**

  

```typescript

{

status: boolean,

data: {

xdr: string // Signed transaction XDR

}

}

```

  

```javascript

const  signTransaction  =  async () => {

let transactionData = {

amount: "10", // sending amount

toAddress: "GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY", // receiver address

signTransaction: true,

};

try {

const  result  =  await diamWalletSdk.sendTransaction(transactionData);

console.log(result);

} catch (error) {

console.error('Failed to sign transaction:', error);

}

};

```

  

### 5. Send Signed Transaction

  

Broadcasts a previously signed XDR transaction.

  

**Parameters:**

  

```typescript

{

signTransaction: false,

xdr: string // Signed XDR string

}

```

  

**Returns:**

  

```typescript

{

status: boolean,

data: Array<object>; // Array of generic objects

}

```

  

```javascript

const  sendSignedXDRTransaction  =  async () => {

let transactionData = {

signTransaction: false,

xdr: selectedXDR,

};

try {

const  result  =  await diamWalletSdk.sendTransaction(transactionData);

console.log(result);

} catch (error) {

console.error("Failed to send transaction:", error);

}

};

```

  

### 6. Validate Public Address

  

Validates if a given address is formatted correctly.

  

**Parameters:**

  

```typescript

publicAddress: string // Address to validate

```

  

**Returns:**

  

```typescript

{

valid: boolean

}

```

  

```javascript

const  addressValidation  =  async () => {

let valid =  await diamWalletSdk.validatePublicAddress(

"GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY"  // receiver address

);

console.log(valid); // {valid: true/false}

};

```

  

### 7. Disconnect Wallet

  

Terminates the connection with the DIAM Wallet.

  

**Returns:**

  

```typescript

{

status: boolean,

message?: string // Optional status message

}

```

  

```javascript

const  disconnectWallet  =  async () => {

try {

await diamWalletSdk.disconnect();

} catch (error) {

console.error("Failed to disconnect wallet:", error);

alert(`Failed to disconnect: \n${error.message}`);

}

};

```

  

## Configuration Options

  

| Option | Type | Description | Mandatory |

|--------|------|-------------|-----------|

| `diamWalletOptions.platform` | string | Name of your platform | Yes |

| `diamWalletOptions.appCallback` | string | URL of your dApp | Yes |

| `diamWalletOptions.appName` | string | Name of your dApp | Yes |

| `diamWalletOptions.network` | string | Network name ("testnet" or "mainnet") | Yes |

  

## Available Methods

  

-  `connectWallet()`: Connect to DIAM Wallet Application

-  `getBalance()`: Fetch balance for the connected wallet

-  `sendTransaction({amount, toAddress, signTransaction: false})`: Send transaction to specified public address

-  `signTransaction({amount, toAddress, signTransaction: true})`: Sign transaction for specified public address

-  `sendTransaction({signTransaction: false, xdr})`: Send signed XDR transaction

-  `validatePublicAddress(publicAddress)`: Validate public address

-  `disconnect()`: Terminate DIAM Wallet connection

  

## Resources

  

- [GitHub Repository](https://github.com/diamante-io/diamwallet-sdk/tree/main/diamwallet-sdk-vite-mobile)

- [Issues](https://github.com/diamante-io/diamwallet-sdk/issues)

- [Example Project](https://github.com/diamante-io/diamwallet-sdk/tree/main/Example)

  

## Support

  

For additional support, please open an issue on our [GitHub repository](https://github.com/diamante-io/diamwallet-sdk/issues).

  

## License

  

The DIAM Wallet Mobile SDK is licensed under the [MIT License](https://opensource.org/licenses/MIT).

  

You are free to use, modify, and distribute the SDK in your projects, subject to the conditions of the MIT License.

  

## Conditions

  

- The software is provided "as is", without any warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and noninfringement.

- In no event shall the authors or copyright holders be liable for any claim, damages, or other liability, whether in an action of contract, tort, or otherwise, arising from, out of, or in connection with the software or the use or other dealings in the software