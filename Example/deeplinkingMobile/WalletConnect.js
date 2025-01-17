// App.js
import DIAMWalletConnectionSDK from 'diamwallet-sdk';
import React, {useState, useEffect} from 'react';
import {View, Text, Button, StyleSheet, Alert, TextInput} from 'react-native';

function WalletConnet() {
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(null);
  const [sendView, setSendView] = useState(false);
  const [signView, setSignView] = useState(false);
  const [amount, setAmount] = useState('');
  const [publicAddress, setPublicAddress] = useState('');
  const [validPublicAddress, setValicPublicAddress] = useState(null);
  const rnDiamWallet = new DIAMWalletConnectionSDK({
    platform: 'mobile',
    appCallback: 'app-scheme://callback',
    appName: 'Demo App',
    network: 'testnet', //"mainnet"
  });
  const amountRejex = /^\d*\.?\d{0,6}$/;

  const [selectedXDR, setSelectedXdr] = useState('');

  const getDIAMBalance = async () => {
    let balanceResponse = await rnDiamWallet.getBalance();
    setBalance(balanceResponse?.data?.balance || '0');
  };

  const connectWallet = async () => {
    try {
      console.log('Connecting wallet...');
      const result = await rnDiamWallet.connectWallet();
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
    } finally {
      let balanceResponse = await rnDiamWallet.getBalance();
      console.log(balanceResponse);
      setBalance(balanceResponse?.data?.balance || '0');
      // sdk.disconnect();
    }
  };

  const sendTransaction = async () => {
    let transactionData = {
      amount: amount,
      toAddress: publicAddress,
      signTransaction: false,
    };
    try {
      const result = await rnDiamWallet.sendTransaction(transactionData);
      console.log('Send Initiated!---', result.success);
      if (result.success === true) {
        setAmount('');
        setPublicAddress('');
        setSendView(false);
        setValicPublicAddress(null);
        Alert.alert(
          'Transaction Success',
          `Hash: ${result.transactionDetails.hash}`,
          [{text: 'OK'}],
        );
      } else {
        Alert.alert('Transaction Failed', result.transactionStatus, [
          {text: 'OK'},
        ]);
      }
      // setAddress(result.address);
      // setConnectionStatus(result.status);
      // getDIAMBalance();
    } catch (error) {
      console.error('Failed to send transaction:', error);
      setAmount('');
      setPublicAddress('');
      setSendView(false);
      setValicPublicAddress(null);
    } finally {
    }
  };

  const handleDisconnect = () => {
    rnDiamWallet.disconnect();
    setAddress('');
    setConnectionStatus(false);
    setBalance(null);
    setSignView(false);
    setSendView(false);

    setAmount('');
    setPublicAddress('');
    setValicPublicAddress(null);
  };
  const initialzile = async () => {
    let data = await rnDiamWallet.initializeSdk();
    if (data) {
      setAddress(data.address);
      setConnectionStatus(data.status);
      let balanceResponse = await rnDiamWallet.getBalance();
      setBalance(balanceResponse.data.balance);
    }
  };
  useEffect(() => {
    initialzile();
  }, []);

  const addressValidation = async () => {
    let valid = await rnDiamWallet.validatePublicAddress(publicAddress);
    console.log(valid);
    if (valid.valid === false) {
      Alert.alert(
        'Address Validation',
        `${publicAddress} \n\nis not valid address`,
      );
      return;
    }
    setValicPublicAddress(valid.valid);
  };

  const signTransaction = async () => {
    let transactionData = {
      amount: amount,
      toAddress: publicAddress,
      signTransaction: true,
    };
    try {
      const result = await rnDiamWallet.signTransaction(transactionData);
      if (result.success === true) {
        setSelectedXdr(result.signedXdr);
      } else {
        Alert.alert('Transaction Failed', result.transactionStatus, [
          {text: 'OK'},
        ]);
      }
      // setAddress(result.address);
      // setConnectionStatus(result.status);
      // getDIAMBalance();
    } catch (error) {
      console.error('Failed to send transaction:', error);
    } finally {
    }
  };

  const sendSignedXDRTransaction = async () => {
    let transactionData = {
      // amount: '1',
      // toAddress: 'GBALA3OP3SB5CWR2CZRBKJXECBDBHNFTYJEN7JHIX4XYFC427CJ2DAUT',
      signTransaction: false,
      xdr: selectedXDR,
    };
    try {
      const result = await rnDiamWallet.sendTransaction(transactionData);
      console.log('Send Initiated!---', result.success);
      if (result.success === true) {
        setSelectedXdr('');
        Alert.alert(
          'Transaction Success',
          `Hash: ${result.transactionDetails.hash}`,
          [{text: 'OK'}],
        );
        setAmount('');
        setPublicAddress('');
        setSignView(false);
        setValicPublicAddress(null);
      } else {
        Alert.alert('Transaction Failed', result.transactionStatus, [
          {text: 'OK'},
        ]);
      }
      // setAddress(result.address);
      // setConnectionStatus(result.status);
      // getDIAMBalance();
    } catch (error) {
      console.error('Failed to send transaction:', error);
      setAmount('');
      setPublicAddress('');
      setSignView(false);
      setValicPublicAddress(null);
    } finally {
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{connectionStatus}</Text>
      {address !== '' && (
        <Text style={styles.balance}>
          Wallet Address:{' '}
          {'\n' + address.slice(0, 7) + '...' + address.slice(-7)}
        </Text>
      )}
      {balance !== null && (
        <Text style={styles.balance}>Available Balance: {balance}</Text>
      )}
      <View style={styles.buttonContainer}>
        {connectionStatus === false ? (
          <Button
            title="Connect Wallet"
            onPress={connectWallet}
            // disabled={sdk.isConnected()}
          />
        ) : (
          <>
            <View style={{marginVertical: 10}}>
              <Button
                title="Get Balance"
                onPress={getDIAMBalance}

                // disabled={sdk.is()}
              />
            </View>
            <View
              style={{
                marginVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                // gap: 4,
                width: '100%',
              }}>
              <View style={{width: `${100 / 2.2}%`}}>
                <Button
                  title="Sign Transaction"
                  onPress={() => {
                    setSignView(true);
                    setAmount('');
                    setPublicAddress('');
                    setValicPublicAddress(null);
                  }}
                  // style={{width: '48%'}}

                  // disabled={sdk.is()}
                />
              </View>
              <View style={{width: `${100 / 2.2}%`}}>
                <Button
                  title="Send Transaction"
                  onPress={
                    // sendTransaction
                    () => {
                      setSendView(true);
                      setAmount('');
                      setPublicAddress('');
                      setValicPublicAddress(null);
                    }
                  }
                  // style={{width: '48%'}}

                  // disabled={sdk.is()}
                />
              </View>
            </View>

            {sendView === true && (
              <>
                <View
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    alignItems: 'center',
                  }}>
                  <TextInput
                    style={{
                      paddingVertical: 2,
                      width: '100%',
                      paddingHorizontal: 10,
                      color: '#000',
                    }}
                    placeholder="Enter Public Address"
                    value={publicAddress}
                    keyboardType="email-address"
                    onChangeText={e => {
                      setPublicAddress(e);
                    }}
                  />
                </View>
                <View
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    alignItems: 'center',
                  }}>
                  <TextInput
                    style={{
                      paddingVertical: 2,
                      width: '100%',
                      paddingHorizontal: 10,
                      color: '#000',
                    }}
                    returnKeyType="done"
                    placeholder="Enter amount"
                    value={amount}
                    keyboardType="number-pad"
                    onChangeText={e => {
                      if (e === '' || amountRejex.test(e)) {
                        setAmount(e);
                      }
                    }}
                  />
                </View>
                <View
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 10,
                  }}>
                  <View style={{width: `30%`}}>
                    <Button
                      title="Validate address"
                      onPress={addressValidation}
                      disabled={
                        publicAddress === '' || publicAddress.length < 5
                      }
                    />
                  </View>
                  <View style={{width: '30%'}}>
                    <Button
                      title="Send"
                      onPress={sendTransaction}
                      disabled={
                        amount === '' ||
                        validPublicAddress === null ||
                        validPublicAddress === false
                      }
                    />
                  </View>
                  <View style={{width: '30%'}}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setAmount('');
                        setPublicAddress('');
                        setSendView(false);
                        setValicPublicAddress(null);
                      }}
                    />
                  </View>
                </View>
              </>
            )}
            {signView === true && (
              <>
                <View
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    alignItems: 'center',
                  }}>
                  <TextInput
                    style={{
                      paddingVertical: 2,
                      width: '100%',
                      paddingHorizontal: 10,
                      color: '#000',
                    }}
                    returnKeyType="done"
                    editable={selectedXDR === ''}
                    placeholder="Enter Public Address"
                    value={publicAddress}
                    keyboardType="email-address"
                    onChangeText={e => {
                      setPublicAddress(e);
                      setValicPublicAddress(null);
                    }}
                  />
                </View>
                <View
                  style={{
                    width: '100%',
                    borderWidth: 1,
                    alignItems: 'center',
                  }}>
                  <TextInput
                    style={{
                      paddingVertical: 2,
                      width: '100%',
                      paddingHorizontal: 10,
                      color: '#000',
                    }}
                    returnKeyType="done"
                    editable={selectedXDR === ''}
                    placeholder="Enter amount"
                    value={amount}
                    keyboardType="number-pad"
                    onChangeText={e => {
                      if (e === '' || amountRejex.test(e)) {
                        setAmount(e);
                      }
                    }}
                  />
                </View>
                <View
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 10,
                  }}>
                  <View style={{width: `30%`}}>
                    <Button
                      title="Validate address"
                      onPress={addressValidation}
                      disabled={
                        publicAddress === '' ||
                        publicAddress.length < 5 ||
                        selectedXDR !== ''
                      }
                    />
                  </View>
                  <View style={{width: '30%'}}>
                    <Button
                      title="Sign"
                      onPress={signTransaction}
                      disabled={
                        amount === '' ||
                        validPublicAddress === null ||
                        validPublicAddress === false ||
                        selectedXDR !== ''
                      }
                    />
                  </View>
                  <View style={{width: '30%'}}>
                    <Button
                      title="Cancel"
                      onPress={() => {
                        setAmount('');
                        setPublicAddress('');
                        setSignView(false);
                        setValicPublicAddress(null);
                      }}
                    />
                  </View>
                </View>
              </>
            )}

            {selectedXDR !== '' && (
              <View style={{marginVertical: 10}}>
                <Button
                  title="Send Signed Transaction "
                  onPress={sendSignedXDRTransaction}
                  // disabled={sdk.is()}
                />
              </View>
            )}

            <View style={{marginVertical: 10}}>
              <Button
                title="Disconnect Wallet"
                onPress={handleDisconnect}
                // disabled={sdk.is()}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default WalletConnet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  status: {
    fontSize: 18,
    marginBottom: 20,
  },
  balance: {
    fontSize: 16,
    // marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
  },
});
