// ignore_for_file: unnecessary_null_comparison

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:url_launcher/url_launcher.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:http/http.dart' as http;

import 'utils/common_functions.dart';

class DIAMWalletConnectionSDK {
  final String serverUrl;
  final String appCallback;
  final String scheme;
  io.Socket? socket;
  String? sessionId;
  Timer? pollTimer;
  final String platform;
  bool disconnected = false;
  final String appName;
  Map<String, dynamic>? transData;
  String? address;
  String? xdrData;
  final String network;

  DIAMWalletConnectionSDK({required Map<String, dynamic> options})
    : serverUrl = "https://dwsprod.diamante.io",
      appCallback = options['appCallback'] ?? '',
      scheme = "diamwallet",
      platform = options['platform'] ?? '',
      appName = options['appName'] ?? '',
      network = options['network'] ?? '';

  Future<String> registerSession([String type = "wallet"]) async {
    final endpoint =
        type == "wallet"
            ? "api/session/register-session"
            : "api/session/register-transaction";

    final response = await http.get(Uri.parse('$serverUrl/$endpoint'));
    final data = jsonDecode(response.body);
    sessionId = data['sessionId'];
    return sessionId!;
  }

  String createDeeplinkUrl(
    String action, [
    Map<String, String> params = const {},
  ]) {
    final Uri uri = Uri(scheme: scheme, host: action, queryParameters: params);
    return uri.toString();
  }

  Future<void> openWallet() async {
    if (sessionId == null) {
      throw Exception('No active session. Call registerSession first.');
    }

    final url = createDeeplinkUrl("connect", {
      "appName": appName,
      "sessionId": sessionId!,
      "callback": appCallback,
      "network": network,
    });

    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (err) {
      if (Platform.isAndroid) {
        await launchUrl(
          Uri.parse(
            "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN",
          ),
          mode: LaunchMode.externalApplication,
        );
      } else if (Platform.isIOS) {
        await launchUrl(
          Uri.parse("https://apps.apple.com/in/app/diam-wallet/id6450691849"),
          mode: LaunchMode.externalApplication,
        );
      }
      socket?.disconnect();
    }
  }

  Future<Map<String, dynamic>?> initializeSdk() async {
    final prefs = await SharedPreferences.getInstance();
    final existingData = prefs.getString('DIAMWALLETFLUTTERDATA');

    if (existingData == null) {
      return null;
    } else {
      final data = jsonDecode(existingData);
      return {'address': data['walletAddress'], 'status': true};
    }
  }

  Future<Map<String, dynamic>> connectWallet([int timeout = 300000]) async {
    try {
      // Ensure socket is disconnected and nullified before proceeding
      if (socket?.connected ?? false) {
        socket?.disconnect();
        socket = null;
      }

      // Ensure session is registered before proceeding
      await registerSession("wallet");

      final completer =
          Completer<
            Map<String, dynamic>
          >(); // Use Map<String, dynamic> for consistency

      // Create a new socket connection
      socket = io.io(serverUrl, <String, dynamic>{
        'transports': ['websocket'],
      });

      Timer? heartbeatTimer;
      const heartbeatInterval = 30000;

      // Function to close the WebSocket and cancel heartbeat
      void closeWebSocket([String reason = "Client closing connection"]) {
        socket?.disconnect();
        heartbeatTimer?.cancel();
      }

      socket?.onConnect((_) {
        // Send initial subscription message once connected
        socket?.emit('subscribe', {
          'sessionId': sessionId,
          'action': 'connect',
        });

        openWallet(); // Call after WebSocket opens

        heartbeatTimer = Timer.periodic(
          Duration(milliseconds: heartbeatInterval),
          (_) {
            if (socket?.connected ?? false) {
              print('Sending ping...');
              socket?.emit('ping');
            } else {
              print('Socket disconnected, clearing heartbeat');
              heartbeatTimer?.cancel();
            }
          },
        );
      });

      socket?.onError((error) {
        print('Socket error: $error');
      });

      socket?.onDisconnect((reason) {
        print('Socket disconnected. Reason: $reason');
        _startPolling(
          completer,
          timeout,
        ); // Ensure you handle polling if necessary
        heartbeatTimer?.cancel();
      });

      socket?.on('data', (data) async {
        try {
          print(data);
          if (data['status'] == true) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString(
              'DIAMWALLETFLUTTERDATA',
              jsonEncode({'walletAddress': data['address']}),
            );

            closeWebSocket('Wallet connection successful');

            // Send the result to completer only once
            if (!completer.isCompleted) {
              completer.complete({'status': true, 'address': data['address']});
            }
          } else if (data.status == "connecting") {
            completer.complete(data);
          } else {
            closeWebSocket('Failed to connect wallet');
            // Complete with an error only once
            if (!completer.isCompleted) {
              completer.completeError(Exception('Failed to connect wallet'));
            }
          }
        } catch (error) {
          print('WebSocket message handling error: $error');
          closeWebSocket('Message handling error');
          // Complete with an error only once
          if (!completer.isCompleted) {
            completer.completeError(error);
          }
        }
      });

      // Set timeout
      Timer(Duration(milliseconds: timeout), () {
        if (!completer.isCompleted) {
          closeWebSocket('Connection timeout');
          completer.completeError(Exception('Wallet connection timeout'));
        }
      });

      return completer.future;
    } catch (error) {
      print('Error during session registration: $error');
      rethrow;
    }
  }

  Future<dynamic> sendTransaction(
    Map<String, dynamic> transData, [
    int timeout = 300000,
  ]) async {
    try {
      // Clear previous socket connection
      if (socket?.connected ?? false) {
        socket?.disconnect();
        socket = null;
      }

      final prefs = await SharedPreferences.getInstance();
      final walletData = prefs.getString('DIAMWALLETFLUTTERDATA');
      if (walletData == null) {
        throw Exception('No wallet data found');
      }

      final walletInfo = jsonDecode(walletData);
      address = walletInfo['walletAddress'];
      this.transData = transData;

      // Register transaction session
      await registerSession("transaction");

      final completer = Completer<dynamic>();

      // Initialize new socket connection
      socket = io.io(serverUrl, <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
      });

      Timer? heartbeatTimer;
      const heartbeatInterval = 30000;

      void closeWebSocket([String reason = "Client closing connection"]) {
        print('Closing socket: $reason');
        socket?.disconnect();
        heartbeatTimer?.cancel();
      }

      socket?.connect();

      socket?.onConnect((_) {
        print('Socket connected');
        socket?.emit('subscribe', {
          'sessionId': sessionId,
          'action': 'transaction',
          'transData': this.transData,
          'walletAddress': address,
        });

        sendOpenWallet();

        heartbeatTimer = Timer.periodic(
          Duration(milliseconds: heartbeatInterval),
          (_) {
            if (socket?.connected ?? false) {
              print('Sending ping...');
              socket?.emit('ping');
            } else {
              print('Socket disconnected, clearing heartbeat');
              heartbeatTimer?.cancel();
            }
          },
        );
      });

      socket?.onConnectError((error) {
        print('Connection error: $error');
      });

      socket?.onError((error) {
        print('Socket error: $error');
      });

      socket?.onDisconnect((reason) {
        print('Socket disconnected. Reason: $reason');
        _startTransactionPolling(completer, timeout);
        heartbeatTimer?.cancel();
      });

      socket?.on('data', (data) {
        try {
          switch (data['status']) {
            case 'completed':
              closeWebSocket('Transaction completed');
              completer.complete(data['data']);
              break;
            case 'failed':
              closeWebSocket('Transaction failed');
              completer.completeError(Exception(data['error']));
              break;
            case 'cancelled':
              closeWebSocket('Transaction cancelled');
              completer.complete(data);
              break;
            case 'processing':
            case 'transaction_initiated':
              completer.complete(data['data']);
              break;
            default:
              print('Unknown transaction status: ${data['status']}');
          }
        } catch (error) {
          closeWebSocket('Transaction error');
          completer.completeError(error);
        }
      });

      // Timeout logic
      Timer(Duration(milliseconds: timeout), () {
        if (!completer.isCompleted) {
          closeWebSocket('Transaction timeout');
          completer.completeError(Exception('Transaction timeout'));
        }
      });

      return completer.future;
    } catch (error) {
      print('Transaction error: $error');
      throw Exception('Transaction failed: ${error.toString()}');
    }
  }

  Future<void> sendOpenWallet() async {
    if (sessionId == null) {
      throw Exception('No active session. Call registerSession first.');
    }

    if (transData == null) {
      throw Exception('No transaction data provided');
    }

    final params = {
      'sessionId': sessionId!,
      'callback': appCallback,
      'appName': appName,
      'signTransaction': transData!['signTransaction'] ?? '',
      'network': network,
    };

    // Optional encryption of essential fields
    final encryptData = encrypt(
      jsonEncode({
        'toAddress': transData!['toAddress'],
        'amount': transData!['amount'],
        'fromAddress': address,
      }),
    );

    if (transData!.containsKey('xdr') && transData!['xdr'] != null) {
      final response = await http.post(
        Uri.parse('$serverUrl/api/transaction/decode-XDR'),
        body: jsonEncode({'xdr': transData!['xdr']}),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      );

      final data = jsonDecode(response.body);
      params.addAll({
        'toAddress': data['data']['toAddress'],
        'amount': data['data']['amount'],
        'fromAddress': address!,
        'xdr': transData!['xdr'],
        'signed': 'true',
      });
    } else {
      final generatedXdr = await getXdr({'encryptedTransData': encryptData});
      params.addAll({
        'toAddress': transData!['toAddress'],
        'amount': transData!['amount'],
        'fromAddress': address!,
        'xdr': generatedXdr,
      });
    }

    final action = 'send';
    final url = createDeeplinkUrl(
      action,
      params.map((key, value) => MapEntry(key, value.toString())),
    );

    print("Launching deep link: $url");

    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (err) {
      print("Error launching deep link: $err");
      if (Platform.isAndroid) {
        await launchUrl(
          Uri.parse(
            'https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN',
          ),
          mode: LaunchMode.externalApplication,
        );
      } else if (Platform.isIOS) {
        await launchUrl(
          Uri.parse('https://apps.apple.com/in/app/diam-wallet/id6450691849'),
          mode: LaunchMode.externalApplication,
        );
      }

      socket?.disconnect();
    }
  }

  Future<void> sendBep20OpenWallet() async {
    if (sessionId == null) {
      throw Exception('No active session. Call registerSession first.');
    }

    final params = {
      'sessionId': sessionId!,
      'callback': appCallback,
      'appName': appName,
      'signTransaction': transData?['signTransaction'] ?? '',
      'token': 'DIAM (BEP20)',
      'network': network,
    };

    print(params);

    if (transData != null) {
      params.addAll({
        'toAddress': transData!['toAddress'],
        'amount': transData!['amount'],
        'fromAddress': address!,
      });
    }

    print(params);

    final action = transData != null ? 'send' : 'connect';
    final url = createDeeplinkUrl(
      action,
      params.map((key, value) => MapEntry(key, value.toString())),
    );

    try {
      await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    } catch (err) {
      if (Platform.isAndroid) {
        await launchUrl(
          Uri.parse(
            'https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN',
          ),
          mode: LaunchMode.externalApplication,
        );
      } else if (Platform.isIOS) {
        await launchUrl(
          Uri.parse('https://apps.apple.com/in/app/diam-wallet/id6450691849'),
          mode: LaunchMode.externalApplication,
        );
      }
      socket?.disconnect();
    }
  }

  Future<dynamic> sendBEP20Transaction(
    Map<String, dynamic> transData, [
    int timeout = 300000,
  ]) async {
    print(transData);
    try {
      final prefs = await SharedPreferences.getInstance();
      final walletData = prefs.getString('DIAMWALLETFLUTTERDATA');

      if (walletData == null) {
        throw Exception('No wallet data found');
      }

      final walletInfo = jsonDecode(walletData);
      print(walletInfo['walletAddress']);
      address = walletInfo['walletAddress'];
      this.transData = transData;

      // Register transaction session
      await registerSession('transaction');

      final completer = Completer<dynamic>();

      // Close existing socket connection if any
      socket?.disconnect();

      socket = io.io(serverUrl, <String, dynamic>{
        'transports': ['websocket'],
      });

      Timer? heartbeatTimer;
      const heartbeatInterval = 30000;

      void closeWebSocket([String reason = "Client closing connection"]) {
        socket?.disconnect();
        heartbeatTimer?.cancel();
      }

      socket?.onConnect((_) {
        socket?.emit('subscribe', {
          'sessionId': sessionId,
          'action': 'transaction',
          'transData': this.transData,
          'walletAddress': address,
        });

        sendBep20OpenWallet();

        heartbeatTimer = Timer.periodic(
          Duration(milliseconds: heartbeatInterval),
          (_) {
            if (socket?.connected ?? false) {
              socket?.emit('ping');
            } else {
              heartbeatTimer?.cancel();
            }
          },
        );
      });

      socket?.onConnectError((error) {
        print('Connection error: $error');
      });

      socket?.onError((error) {
        print('Socket error: $error');
      });

      socket?.onDisconnect((reason) {
        print('Socket disconnected. Reason: $reason');
        _startTransactionPolling(completer, timeout);
        heartbeatTimer?.cancel();
      });

      socket?.on('data', (data) {
        try {
          print(data);

          switch (data['status']) {
            case 'completed':
              closeWebSocket('Transaction completed');
              completer.complete(data['data']);
              break;
            case 'failed':
              closeWebSocket('Transaction failed');
              completer.completeError(Exception(data['error']));
              break;
            case 'cancelled':
              closeWebSocket('Transaction cancelled');
              completer.complete(data);
              break;
            case 'processing':
              completer.complete(data['data']);
              break;
            case 'transaction_initiated':
              completer.complete(data['data']);
              break;
            default:
              print('Unknown transaction status: ${data['status']}');
          }
        } catch (error) {
          closeWebSocket('Transaction failed');
          completer.completeError(error);
        }
      });

      // Set timeout
      Timer(Duration(milliseconds: timeout), () {
        if (!completer.isCompleted) {
          print('Transaction timeout.');
          closeWebSocket('Transaction timeout');
          completer.completeError(Exception('Transaction timeout'));
        }
      });

      return completer.future;
    } catch (error) {
      print('Transaction error: $error');
      throw Exception('Transaction failed: ${error.toString()}');
    }
  }

  Future<String> getXdr(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$serverUrl/api/transaction/getXdr'),
      body: jsonEncode(data),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    );

    final xdrData = jsonDecode(response.body);
    return xdrData['data']['xdr'];
  }

  Future<dynamic> signTransaction(
    Map<String, dynamic> transData, [
    int timeout = 300000,
  ]) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final walletData = prefs.getString('DIAMWALLETFLUTTERDATA');

      if (walletData == null) {
        throw Exception('No wallet data found');
      }

      final walletInfo = jsonDecode(walletData);
      address = walletInfo['walletAddress'];
      this.transData = transData;

      // Register transaction session
      await registerSession('transaction');

      final completer = Completer<dynamic>();

      socket = io.io(serverUrl, <String, dynamic>{
        'transports': ['websocket'],
      });

      Timer? heartbeatTimer;
      const heartbeatInterval = 30000;

      void closeWebSocket([String reason = "Client closing connection"]) {
        socket?.disconnect();
        heartbeatTimer?.cancel();
      }

      socket?.onConnect((_) {
        socket?.emit('subscribe', {
          'sessionId': sessionId,
          'action': 'transaction',
          'transData': this.transData,
          'walletAddress': address,
        });

        sendOpenWallet();

        heartbeatTimer = Timer.periodic(
          Duration(milliseconds: heartbeatInterval),
          (_) {
            if (socket?.connected ?? false) {
              print('Sending ping...');
              socket?.emit('ping');
            } else {
              print('Socket disconnected, clearing heartbeat');
              heartbeatTimer?.cancel();
            }
          },
        );
      });

      socket?.onConnectError((error) {
        print('Connection error: $error');
      });

      socket?.onError((error) {
        print('Socket error: $error');
      });

      socket?.onDisconnect((reason) {
        print('Socket disconnected. Reason: $reason');
        _startSignTransactionPolling(completer, timeout);
        heartbeatTimer?.cancel();
      });

      socket?.on('data', (data) {
        try {
          switch (data['status']) {
            case 'sign-completed':
              closeWebSocket('Transaction Signing completed');
              completer.complete(data['data']);
              break;
            case 'sign-failed':
              closeWebSocket('Transaction Signing failed');
              completer.completeError(Exception(data['error']));
              break;
            case 'cancelled':
              closeWebSocket('Signing cancelled');
              completer.complete(data);
              break;
            case 'sign-processing':
              completer.complete(data);
              break;
            case 'sign-transaction':
              completer.complete(data);
              break;
            default:
              print('Unknown signing status: ${data['status']}');
          }
        } catch (error) {
          closeWebSocket('Error processing signing message');
          completer.completeError(error);
        }
      });

      // Set timeout
      Timer(Duration(milliseconds: timeout), () {
        if (!completer.isCompleted) {
          closeWebSocket('Transaction Signing timeout');
          completer.completeError(Exception('Transaction Signing timeout'));
        }
      });

      return completer.future;
    } catch (error) {
      print('Signing error: $error');
      throw Exception('Transaction Signing failed: ${error.toString()}');
    }
  }

  void _startPolling(Completer<Map<String, dynamic>> completer, int timeout) {
    final startTime = DateTime.now().millisecondsSinceEpoch;

    pollTimer = Timer.periodic(Duration(milliseconds: 2000), (timer) async {
      try {
        final response = await http.get(
          Uri.parse('$serverUrl/api/session/check-connection/$sessionId'),
        );
        final data = jsonDecode(response.body);

        if (data['status'] == true) {
          timer.cancel();
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(
            'DIAMWALLETFLUTTERDATA',
            jsonEncode({'walletAddress': data['address']}),
          );

          socket?.disconnect();

          if (!completer.isCompleted) {
            completer.complete({'status': true, 'address': data['address']});
          }
        } else if (DateTime.now().millisecondsSinceEpoch - startTime >
            timeout) {
          timer.cancel();
          if (!completer.isCompleted) {
            completer.completeError(Exception('Connection timeout'));
          }
        }
      } catch (error) {
        print('Polling error: $error');
      }
    });
  }

  void _startTransactionPolling(Completer completer, int timeout) {
    final startTime = DateTime.now().millisecondsSinceEpoch;

    void closeWebSocket([String reason = "Client closing connection"]) {
      socket?.disconnect();
      pollTimer?.cancel();
    }

    pollTimer = Timer.periodic(Duration(milliseconds: 2000), (timer) async {
      try {
        print('$serverUrl/api/transaction/check-transaction/$sessionId');
        final response = await http.get(
          Uri.parse('$serverUrl/api/transaction/check-transaction/$sessionId'),
        );
        final data = jsonDecode(response.body);

        switch (data['status']) {
          case 'completed':
            closeWebSocket('Transaction completed');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.complete(data['data']);
            }
            break;
          case 'failed':
            closeWebSocket('Transaction failed');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.completeError(Exception(data['error']));
            }
            break;
          case 'cancelled':
            closeWebSocket('Transaction cancelled');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.completeError(Exception(data['error']));
            }
            break;
          case 'processing':
            if (!completer.isCompleted) {
              completer.complete(data);
            }
            break;
          default:
            print('Unknown transaction status: $data');
        }
      } catch (error) {
        timer.cancel();
        if (!completer.isCompleted) {
          completer.completeError(error);
        }
      }
    });
  }

  void _startSignTransactionPolling(Completer completer, int timeout) {
    final startTime = DateTime.now().millisecondsSinceEpoch;

    void closeWebSocket([String reason = "Client closing connection"]) {
      socket?.disconnect();
      pollTimer?.cancel();
    }

    pollTimer = Timer.periodic(Duration(milliseconds: 2000), (timer) async {
      try {
        final response = await http.get(
          Uri.parse(
            '$serverUrl/api/transaction/check-signed-transaction/$sessionId',
          ),
        );
        final data = jsonDecode(response.body);

        switch (data['status']) {
          case 'sign-completed':
            closeWebSocket('Transaction Signing completed');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.complete(data['data']);
            }
            break;
          case 'sign-failed':
            closeWebSocket('Transaction Signing failed');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.completeError(Exception(data['error']));
            }
            break;
          case 'sign-cancelled':
            closeWebSocket('Transaction Signing cancelled');
            timer.cancel();
            if (!completer.isCompleted) {
              completer.completeError(Exception(data['error']));
            }
            break;
          case 'sign-processing':
            if (!completer.isCompleted) {
              completer.complete(data);
            }
            break;
          case 'sign-transaction':
            if (!completer.isCompleted) {
              completer.complete(data);
            }
            break;
          default:
            print('Unknown signing status: $data');
        }
      } catch (error) {
        timer.cancel();
        if (!completer.isCompleted) {
          completer.completeError(error);
        }
      }
    });
  }

  Future<dynamic> getBalance() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final walletData = prefs.getString('DIAMWALLETFLUTTERDATA');

      if (walletData == null) {
        throw Exception('No wallet data found');
      }

      final walletInfo = jsonDecode(walletData);

      final data = await getBalanceData({
        'address': walletInfo['walletAddress'],
        'serverUrl': serverUrl,
        'network': network,
      });

      return data;
    } catch (error) {
      print('Balance fetch error: $error');
      rethrow;
    }
  }

  Future<Map<String, bool>> validatePublicAddress(String address) async {
    final response = await http.post(
      Uri.parse('$serverUrl/api/transaction/wallet-address-validation'),
      body: jsonEncode({'address': address, 'network': network}),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    );

    final validData = jsonDecode(response.body);
    if (validData['data']['status'] == 200) {
      return {'valid': true};
    } else {
      return {'valid': false};
    }
  }

  Future<Map<String, bool>> validateBep20PublicAddress(
    String address,
    String token,
  ) async {
    final response = await http.post(
      Uri.parse('$serverUrl/api/transaction/wallet-address-validation'),
      body: jsonEncode({
        'address': address,
        'network': network,
        'token': token,
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    );

    final validData = jsonDecode(response.body);
    print(validData);
    if (validData['data']['status'] == 200) {
      return {'valid': true};
    } else {
      return {'valid': false};
    }
  }

  Future<void> disconnect() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('DIAMWALLETFLUTTERDATA');
      sessionId = null;
      transData = null;
      address = null;
    } catch (error) {
      print('Disconnect error: $error');
      rethrow;
    }
  }
}
