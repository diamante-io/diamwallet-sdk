import 'package:diamwallet_sdk_flutter/diamwallet_sdk_flutter.dart';
import 'package:flutter/material.dart';

class WalletConnectScreen extends StatefulWidget {
  const WalletConnectScreen({super.key});

  @override
  _WalletConnectScreenState createState() => _WalletConnectScreenState();
}

class _WalletConnectScreenState extends State<WalletConnectScreen> {
  TextEditingController toAddressController = TextEditingController();
  TextEditingController amountController = TextEditingController();
  bool isConnected = false;
  String walletAddress = '';
  String balance = '';
  String amount = '';
  String toAddress = '';
  bool sendView = false;
  bool sendBep20View = false;
  String signedXdr = '';

  final diamWalletSdk = DIAMWalletConnectionSDK(
    options: {
      "platform": 'mobile',
      "appCallback": 'app-scheme://callback',
      "appName": 'DIAM Wallet SDK Demo',
      "network": 'testnet', //"mainnet"
    },
  );
  @override
  void initState() {
    super.initState();
    initializeWallet();
  }

  void initializeWallet() async {
    // Assume your SDK has an init method
    final result = await diamWalletSdk.initializeSdk();
    if (result?['status'] == true) {
      setState(() {
        isConnected = true;
        walletAddress = result?['address'];
      });
      getBalance();
    }
  }

  void connectWallet() async {
    try {
      final result = await diamWalletSdk.connectWallet();
      if (result['status'] == true) {
        setState(() {
          isConnected = true;
          walletAddress = result['address'];
        });
        getBalance();
      } else {
        showAlert('Connection Failed', result['data']);
      }
    } catch (e) {
      showAlert('Error', e.toString());
    }
  }

  void getBalance() async {
    final res = await diamWalletSdk.getBalance();

    print(res);
    setState(() {
      balance = res['data']?['balance'] ?? '0';
    });
  }

  void sendTransaction({required bool isBep20}) async {
    print(toAddress);
    final valid =
        isBep20
            ? await diamWalletSdk.validateBep20PublicAddress(
              toAddress,
              'DIAM (BEP20)',
            )
            : await diamWalletSdk.validatePublicAddress(toAddress);
    print(valid);
    if (!valid['valid']!) {
      showAlert('Invalid Address', '$toAddress is not valid');
      return;
    }

    final txData = {
      'amount': amount,
      'toAddress': toAddress,
      'signTransaction': false,
    };

    final result =
        isBep20
            ? await diamWalletSdk.sendBEP20Transaction(txData)
            : await diamWalletSdk.sendTransaction(txData);

    if (result['success'] == true) {
      showAlert('Success', 'Hash: ${result['transactionDetails']['hash']}');
      setState(() {
        sendView = false;
        sendBep20View = false;
        amount = '';
        toAddress = '';
      });
    } else {
      showAlert('Failed', result['transactionStatus']);
    }
  }

  void showAlert(String title, String message) {
    showDialog(
      context: context,
      builder:
          (_) => AlertDialog(
            title: Text(title),
            content: Text(message),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('OK'),
              ),
            ],
          ),
    );
  }

  Widget transactionInputForm({required bool isBep20}) {
    return Container(
      padding: EdgeInsets.all(10),
      margin: EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10),

        border: Border.all(width: 1, color: Colors.grey),
      ),
      child: Column(
        children: [
          Container(
            padding: EdgeInsets.zero,
            width: double.infinity,

            child: Text(
              isBep20 ? "Send DIAM BEP20" : "Send DIAM",
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
          ),
          TextField(
            controller: toAddressController,
            decoration: InputDecoration(labelText: 'Public Address'),
            onChanged: (value) => toAddress = value,
          ),
          TextField(
            controller: amountController,
            decoration: InputDecoration(labelText: 'Amount'),
            keyboardType: TextInputType.number,
            onChanged: (value) => amount = value,
          ),
          SizedBox(height: 10),
          Container(
            padding: EdgeInsets.all(0),
            width: double.infinity,
            child: Center(
              child: Row(
                spacing: 20,
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: () => sendTransaction(isBep20: isBep20),
                    child: Text("Submit"),
                  ),
                  ElevatedButton(
                    onPressed:
                        () => setState(() {
                          sendView = false;
                          sendBep20View = false;
                          amount = '';
                          toAddress = '';
                          amountController.clear();
                          toAddressController.clear();
                        }),
                    child: Text("Cancel"),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void disconnectWallet() {
    setState(() {
      isConnected = false;
      walletAddress = '';
      balance = '';
      amount = '';
      toAddress = '';
      sendView = false;
      sendBep20View = false;
    });
    diamWalletSdk.disconnect();
    showAlert('Disconnected', 'Wallet has been disconnected.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Center(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: double.infinity,
                margin: EdgeInsets.only(bottom: 40),
                child: Text(
                  'DIAM Wallet SDK Demo',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center,
                ),
              ),
              Text(
                'Connection Status: ${isConnected ? "Connected" : "Disconnected"}',
              ),
              if (walletAddress.isNotEmpty)
                Text(
                  'Wallet Address: ${walletAddress.substring(0, 7)}...${walletAddress.substring(walletAddress.length - 7)}',
                ),
              if (balance.isNotEmpty) Text('Balance: $balance DIAM'),
              SizedBox(height: 20),

              isConnected
                  ? Expanded(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              minimumSize: Size(200, 40),
                            ),
                            onPressed: getBalance,
                            child: Text('Get Balance'),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              minimumSize: Size(200, 40),
                            ),
                            onPressed: () {
                              setState(() {
                                sendView = true;
                                sendBep20View = false;
                                toAddress = "";
                                amount = "";
                                amountController.clear();
                                toAddressController.clear();
                              });
                            },
                            child: Text('Send DIAM'),
                          ),
                          ElevatedButton(
                            onPressed: () {
                              setState(() {
                                sendBep20View = true;
                                sendView = false;
                                toAddress = "";
                                amount = "";
                                amountController.clear();
                                toAddressController.clear();
                              });
                            },
                            style: ElevatedButton.styleFrom(
                              minimumSize: Size(200, 40),
                            ),
                            child: Text('Send DIAM (BEP20)'),
                          ),
                          if (sendView) transactionInputForm(isBep20: false),
                          if (sendBep20View)
                            transactionInputForm(isBep20: true),

                          ElevatedButton(
                            onPressed: disconnectWallet,
                            style: ElevatedButton.styleFrom(
                              // backgroundColor: Colors.redAccent,
                              minimumSize: Size(200, 40),
                            ),
                            child: Text('Disconnect Wallet'),
                          ),
                        ],
                      ),
                    ),
                  )
                  : Container(
                    padding: EdgeInsets.all(0),
                    child: ElevatedButton(
                      onPressed: connectWallet,
                      child: Text('Connect Wallet'),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
