
# DIAM Wallet Mobile SDK

The DIAM Wallet Mobile SDK allows developers to seamlessly connect their dApps with both web apps (on Android mobile browsers) and mobile apps (on Android and iOS) through the DIAM Wallet App.

## Getting Started

### Installation

Install the SDK in your Application:

```sh
yarn add diamwallet-sdk
```

```sh
npm install --save diamwallet-sdk
```

### iOS Setup

Install CocoaPods dependencies:

```sh
cd ios && pod install
```

### Setting Up the SDK in Your Application

**Note:** The SDK does not include a wrapper, so it must be initialized in every file where it is used.

#### React Native Implementation

```javascript
import React from 'react';
import DIAMWalletConnectionSDK from 'diamwallet-sdk';

const diamWalletSdk = new DIAMWalletConnectionSDK({
  platform: 'mobile',
  appCallback: 'app-scheme://callback',
  appName: 'Demo App',
  network: 'testnet', // or "mainnet"
});
```

#### React Web Implementation

```javascript
import React from 'react';
import DIAMWalletConnectionSDK from 'diamwallet-sdk';

const diamWalletSdk = new DIAMWalletConnectionSDK({
  platform: "web",
  appCallback: window.location.origin + "/callback",
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
  status: boolean,    // Connection status
  address: string,    // Wallet address if successful
  data?: string      // Error message if failed
}
```

#### React Native

```javascript
const connectWallet = async () => {
  try {
    console.log('Connecting wallet...');
    const result = await diamWalletSdk.connectWallet();
    console.log('Wallet connected!', result);
    
    if (result.status === true) {
      setAddress(result.address);
      setConnectionStatus(result.status);
    } else {
      Alert.alert('Errors', result.data, [{text: 'OK'}]);
    }
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    setConnectionStatus(false);
    Alert.alert(`Failed to connect: \n${error.message}`);
  }
};
```

#### React Web

```javascript
const connectWallet = async () => {
  try {
    console.log("Connecting...");
    const result = await sdk.connectWallet();
    
    if (result.status === true) {
      setConnectionStatus(result.status);
      setWalletAddress(result.address);
      let balanceResponse = await sdk.getBalance();
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
const fetchBalance = async () => {
  let balanceResponse = await diamWalletSdk.getBalance();
  console.log(balanceResponse);
};
```

### 3. Send Transaction

Sends a new transaction to a specified address.

**Parameters:**

```typescript
{
  amount: string,           // Amount to send
  toAddress: string,       // Recipient address
  signTransaction: false   // Must be false for sending
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
const sendTransaction = async () => {
  let transactionData = {
    amount: "10",  // sending amount
    toAddress: "GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY",  // receiver address
    signTransaction: false,
  };
  
  try {
    const result = await diamWalletSdk.sendTransaction(transactionData);
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
  amount: string,          // Amount to send
  toAddress: string,      // Recipient address
  signTransaction: true   // Must be true for signing
}
```

**Returns:**

```typescript
{
  status: boolean,
  data: {
    xdr: string      // Signed transaction XDR
  }
}
```

```javascript
const signTransaction = async () => {   
  let transactionData = {
    amount: "10",  // sending amount
    toAddress: "GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY",  // receiver address
    signTransaction: true,
  };
  
  try {
    const result = await diamWalletSdk.sendTransaction(transactionData);
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
  xdr: string             // Signed XDR string
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
const sendSignedXDRTransaction = async () => {
  let transactionData = {
    signTransaction: false,
    xdr: selectedXDR,
  };
  
  try {
    const result = await diamWalletSdk.sendTransaction(transactionData);
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
publicAddress: string    // Address to validate
```

**Returns:**

```typescript
{
  valid: boolean
}
```

```javascript
const addressValidation = async () => {
  let valid = await diamWalletSdk.validatePublicAddress(
    "GBVKH4ZK6QWETZTQFLQ3JMGXKMRVRK3ZPZ3Z4ACQXY42J6P7F5DRZYNY" // receiver address
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
  message?: string    // Optional status message
}
```

```javascript
const disconnectWallet = async () => {
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

- `connectWallet()`: Connect to DIAM Wallet Application
- `getBalance()`: Fetch balance for the connected wallet
- `sendTransaction({amount, toAddress, signTransaction: false})`: Send transaction to specified public address
- `signTransaction({amount, toAddress, signTransaction: true})`: Sign transaction for specified public address
- `sendTransaction({signTransaction: false, xdr})`: Send signed XDR transaction
- `validatePublicAddress(publicAddress)`: Validate public address
- `disconnect()`: Terminate DIAM Wallet connection

## Support

For additional support, please open an issue on our [GitHub repository](https://github.com/MetaMask/metamask-sdk/issues).
