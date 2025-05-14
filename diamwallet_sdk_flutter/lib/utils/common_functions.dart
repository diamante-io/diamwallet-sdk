import 'dart:convert';

import 'package:http/http.dart' as http;

/// Encrypts data using AES encryption
String encrypt(String data) {
  // You'll need to define your encryption key and IV
  // // This is a simplified implementation; adjust according to your requirements
  // final key = encryptData.Key.fromLength(32); // 256 bits key
  // final iv = encryptData.IV.fromLength(16); // 128 bits IV
  // final encrypter = encryptData.Encrypter(encryptData.AES(key));

  // final encrypted = encrypter.encrypt(data, iv: iv);
  // return encrypted.base64;
  return data;
}

/// Gets wallet balance data from the server
Future<Map<String, dynamic>> getBalanceData(Map<String, dynamic> params) async {
  final encryptData = encrypt(
    jsonEncode({"address": params["address"], "network": params["network"]}),
  );
  print({"encryptedWalletData": encryptData});
  try {
    final response = await http.post(
      Uri.parse('${params['serverUrl']}/api/wallet/get-wallet-balance'),
      body: jsonEncode({"encryptedWalletData": encryptData}),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch balance');
    }
  } catch (error) {
    throw Exception('Balance fetch error: $error');
  }
}
