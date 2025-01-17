export function encrypt(payload) {
  const encrypted = payload;
  //  CryptoJS.AES.encrypt(
  //   payload,
  //   CryptoJS.enc.Hex.parse(AesKey),
  //   {
  //     mode: CryptoJS.mode.ECB,
  //     padding: CryptoJS.pad.Pkcs7,
  //   }
  // ).toString();
  return encrypted;
}

export const getBalanceData = async (params) => {
  let encryptData = encrypt(
    JSON.stringify({
      address: params.address,
      network: params.network,
    })
  );

  let response = await fetch(
    `${params.serverUrl}/api/wallet/get-wallet-balance`,
    {
      method: "POST",
      body: JSON.stringify({
        encryptedWalletData: encryptData,
      }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  const data = await response.json();
  return data;
};
