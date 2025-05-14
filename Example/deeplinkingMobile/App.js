import {View, Text} from 'react-native';
import React from 'react';
import WalletConnet from './WalletConnect';

const App = () => {
  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <WalletConnet />
    </View>
  );
};

export default App;
