import { Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { encrypt, getBalanceData } from "./utils/commonFunctions";

const { io } = require("socket.io-client");

class ReactNativeSDK {
  constructor(options) {
    if (!options || typeof options !== "object") {
      throw new Error("Options object is required");
    }

    this.serverUrl = "https://dwsprod.diamante.io";
    this.appCallback = options.appCallback;
    this.scheme = "diamwallet";
    this.ws = null;
    this.sessionId = null;
    this.pollInterval = null;
    this.platform = options.platform;
    this.disconnected = null;
    this.appName = options.appName;
    this.transData = null;
    this.address = null;
    this.xdrData = null;
    this.network = options.network;
  }

  async registerSession(type = "wallet") {
    const endpoint =
      type === "wallet"
        ? "api/session/register-session"
        : "api/session/register-transaction";

    const response = await fetch(`${this.serverUrl}/${endpoint}`, {
      method: "GET",
    });
    const { sessionId } = await response.json();
    this.sessionId = sessionId;
    return sessionId;
  }

  createDeeplinkUrl(action, params = {}) {
    const url = new URL(`${this.scheme}://${action}`);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    return url.toString();
  }

  openWallet() {
    if (!this.sessionId) {
      throw new Error("No active session. Call registerSession first.");
    }

    const url = this.createDeeplinkUrl("connect", {
      appName: this.appName,
      sessionId: this.sessionId,
      callback: this.appCallback,
      network: this.network,
    });

    Linking.openURL(url).catch((err) => {
      if (Platform.OS === "android") {
        Linking.openURL(
          "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN"
        );
      } else {
        Linking.openURL(
          "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        );
      }
      this.ws.close();
    });
  }

  // Usage

  async initializeSdk() {
    const existingDta = JSON.parse(
      await AsyncStorage.getItem("DIAMWALLETDATA")
    );
    if (existingDta === null) {
      // this.openWallet();

      return null;
    } else {
      return { address: existingDta.walletAddress, status: true };
    }
  }

  async connectWallet(timeout = 300000) {
    try {
      // Ensure session is registered before proceeding
      await this.registerSession("wallet");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {});

        let heartbeatIntervalId;
        const HEARTBEAT_INTERVAL = 30000;

        // Add connection status logging
        this.ws.on("connecting", () => {
          console.log("Socket attempting connection...");
        });

        this.ws.on("connect_attempt", () => {
          console.log("Socket connection attempt...");
        });

        const closeWebSocket = (reason = "Client closing connection") => {
          if (this.ws) {
            this.ws.close();
          }
          if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
          // if (timeoutId) clearTimeout(timeoutId);
        };

        this.ws.on("connect", () => {
          // Send initial subscription message
          this.ws.emit(
            "subscribe",
            {
              sessionId: this.sessionId,
              action: "connect",
            },
            (acknowledgement) => {
              // Add acknowledgement callback
              console.log("Subscribe acknowledgement:", acknowledgement);
            }
          );
          this.openWallet(); // Call after WebSocket opens

          heartbeatIntervalId = setInterval(() => {
            if (this.ws.connected) {
              console.log("Sending ping...");
              this.ws.emit("ping");
            } else {
              console.log("Socket disconnected, clearing heartbeat");
              clearInterval(heartbeatIntervalId);
            }
          }, HEARTBEAT_INTERVAL);
        });

        this.ws.on("error", (error) => {
          console.error("Socket error:", error);
        });
        this.ws.on("disconnect", (reason) => {
          console.log(`Socket disconnected. Reason: ${reason}`);
          this.startPolling(resolve, reject, timeout);
          clearInterval(heartbeatIntervalId);
        });

        this.ws.on("data", async (data) => {
          try {
            console.log(data);
            if (data.status === true) {
              await AsyncStorage.setItem(
                "DIAMWALLETDATA",
                JSON.stringify({ walletAddress: data.address })
              );

              closeWebSocket("Wallet connection successful"); // Close WebSocket after success
              resolve({ status: true, address: data.address }); // Resolve the promise on success
            } else if (data.status == "connecting") {
              resolve(data);
            } else {
              closeWebSocket("Failed to connect wallet ");
              reject(new Error("Failed to connect wallet "));
            }
          } catch (error) {
            console.error("WebSocket message handling error:", error);
            closeWebSocket("Message handling error");
            reject(error); // Reject the promise if an error occurs
          }
        });

        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn("Wallet connection timeout.");
            closeWebSocket("Connection timeout");
          }
          reject(new Error("Wallet connection timeout"));
        }, timeout);
      });
    } catch (error) {
      console.error("Error during session registration", error);
      throw error; // Rethrow the error for caller handling
    }
  }

  async sendTransaction(transData, timeout = 300000) {
    try {
      const walletData = await AsyncStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      this.address = walletAddress;
      this.transData = transData;

      // Register transaction session
      await this.registerSession("transaction");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {});

        let heartbeatIntervalId;
        const HEARTBEAT_INTERVAL = 30000;

        // Add connection status logging
        this.ws.on("connecting", () => {
          console.log("Socket attempting connection...");
        });

        this.ws.on("connect_attempt", () => {
          console.log("Socket connection attempt...");
        });

        const closeWebSocket = (reason = "Client closing connection") => {
          if (this.ws) {
            this.ws.close();
          }
          if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        };

        this.ws.on("connect", () => {
          this.ws.emit(
            "subscribe",
            {
              sessionId: this.sessionId,
              action: "transaction",
              transData: this.transData,
              walletAddress: this.address,
            },
            (acknowledgement) => {
              // Add acknowledgement callback
              console.log("Subscribe acknowledgement:", acknowledgement);
            }
          );
          this.sendOpenWallet();
          heartbeatIntervalId = setInterval(() => {
            try {
              if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" })); // Send ping
              }
            } catch (error) {
              clearInterval(heartbeatIntervalId);
              closeWebSocket("Heartbeat mechanism failed");
            }
          }, HEARTBEAT_INTERVAL);
        });
        this.ws.on("connect_error", (error) => {
          console.error("Connection error:", error);
          console.error("Error details:", {
            message: error.message,
            description: error.description,
            type: error.type,
            context: this.ws.io.engine?.transport,
          });
        });

        this.ws.on("error", (error) => {
          console.error("Socket error:", error);
        });

        this.ws.on("disconnect", (reason) => {
          console.log(`Socket disconnected. Reason: ${reason}`);
          this.startTransactionPolling(resolve, reject, timeout);
          clearInterval(heartbeatIntervalId);
        });

        this.ws.on("data", (data) => {
          try {
            switch (data.status) {
              case "completed":
                closeWebSocket("Transaction completed"); // Close WebSocket on success
                resolve(data.data);
                break;
              case "failed":
                closeWebSocket("Transaction failed"); // Close WebSocket on failure
                reject(new Error(data.error));
                break;
              case "cancelled":
                closeWebSocket("Transaction cancelled"); // Close WebSocket on cancellation
                reject(new Error(data.error));
                break;
              case "processing":
                resolve(data.data);
                break;
              case "transaction_initiated":
                resolve(data.data);
                break;
              default:
                console.log("Unknown transaction status:");
            }
          } catch (error) {
            closeWebSocket("Transaction failed"); // Close WebSocket on error
            reject(error);
          }
        });

        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn("Transaction timeout.");
            closeWebSocket("Transaction timeout");
          }
          reject(new Error("Transaction timeout"));
        }, timeout);
      });
    } catch (error) {
      console.error("Transaction error:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
  async sendBep20OpenWallet() {
    if (!this.sessionId) {
      throw new Error("No active session. Call registerSession first.");
    }

    const params = {
      sessionId: this.sessionId,
      callback: this.appCallback,
      appName: this.appName,
      signTransaction: this.transData.signTransaction,
      token: "DIAM (BEP20)",
      network: this.network,
    };
    console.log(params);

    if (this.transData) {
      Object.assign(params, {
        toAddress: this.transData.toAddress,
        amount: this.transData.amount,
        fromAddress: this.address,
      });
    }

    console.log(params);

    const action = this.transData ? "send" : "connect";

    const url = this.createDeeplinkUrl(action, params);

    // if (this.platform === "web") {
    //   window.location.href = url;
    // } else {
    Linking.openURL(url).catch((err) => {
      if (Platform.OS === "android") {
        Linking.openURL(
          "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN"
        );
      } else {
        Linking.openURL(
          "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        );
      }
      this.ws.close();
    });
  }
  async sendBEP20Transaction(transData, timeout = 300000) {
    try {
      const walletData = await AsyncStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      console.log(walletAddress);
      this.address = walletAddress;
      this.transData = transData;

      // Register transaction session
      await this.registerSession("transaction");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {});

        let heartbeatIntervalId;
        const HEARTBEAT_INTERVAL = 30000;

        // Add connection status logging
        this.ws.on("connecting", () => {
          console.log("Socket attempting connection...");
        });

        this.ws.on("connect_attempt", () => {
          console.log("Socket connection attempt...");
        });

        const closeWebSocket = (reason = "Client closing connection") => {
          if (this.ws) {
            this.ws.close();
          }
          if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        };

        this.ws.on("connect", () => {
          this.ws.emit(
            "subscribe",
            {
              sessionId: this.sessionId,
              action: "transaction",
              transData: this.transData,
              walletAddress: this.address,
            },
            (acknowledgement) => {
              // Add acknowledgement callback
              console.log("Subscribe acknowledgement:", acknowledgement);
            }
          );
          this.sendBep20OpenWallet();
          heartbeatIntervalId = setInterval(() => {
            try {
              if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" })); // Send ping
              }
            } catch (error) {
              clearInterval(heartbeatIntervalId);
              closeWebSocket("Heartbeat mechanism failed");
            }
          }, HEARTBEAT_INTERVAL);
        });
        this.ws.on("connect_error", (error) => {
          console.error("Connection error:", error);
          console.error("Error details:", {
            message: error.message,
            description: error.description,
            type: error.type,
            context: this.ws.io.engine?.transport,
          });
        });

        this.ws.on("error", (error) => {
          console.error("Socket error:", error);
        });

        this.ws.on("disconnect", (reason) => {
          console.log(`Socket disconnected. Reason: ${reason}`);
          this.startTransactionPolling(resolve, reject, timeout);
          clearInterval(heartbeatIntervalId);
        });

        this.ws.on("data", (data) => {
          try {
            console.log(data);

            switch (data.status) {
              case "completed":
                closeWebSocket("Transaction completed"); // Close WebSocket on success
                resolve(data.data);
                break;
              case "failed":
                closeWebSocket("Transaction failed"); // Close WebSocket on failure
                reject(new Error(data.error));
                break;
              case "cancelled":
                closeWebSocket("Transaction cancelled"); // Close WebSocket on cancellation
                reject(new Error(data.error));
                break;
              case "processing":
                resolve(data.data);
                break;
              case "transaction_initiated":
                resolve(data.data);
                break;
              default:
                console.log("Unknown transaction status:");
            }
          } catch (error) {
            closeWebSocket("Transaction failed"); // Close WebSocket on error
            reject(error);
          }
        });

        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn("Transaction timeout.");
            closeWebSocket("Transaction timeout");
          }
          reject(new Error("Transaction timeout"));
        }, timeout);
      });
    } catch (error) {
      console.error("Transaction error:", error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async getXdr(data) {
    const response = await fetch(`${this.serverUrl}/api/transaction/getXdr`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    let xdrData = await response.json();

    return xdrData.data.xdr;
  }

  async sendOpenWallet() {
    if (!this.sessionId) {
      throw new Error("No active session. Call registerSession first.");
    }

    const params = {
      sessionId: this.sessionId,
      callback: this.appCallback,
      appName: this.appName,
      signTransaction: this.transData.signTransaction,
      xdr: this.xdrData,
      network: this.network,
    };
    let encryptData = encrypt(
      JSON.stringify({
        toAddress: this.transData.toAddress,
        amount: this.transData.amount,
        fromAddress: this.address,
      })
    );
    if (this.transData) {
      if (this.transData.xdr) {
        let response = await fetch(
          `${this.serverUrl}/api/transaction/decode-XDR`,
          {
            method: "POST",
            body: JSON.stringify({ xdr: this.transData.xdr }),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
        let data = await response.json();
        Object.assign(params, {
          toAddress: data.data.toAddress,
          amount: data.data.amount,
          fromAddress: this.address,
          xdr: this.transData.xdr,
          signed: true,
        });
      } else {
        Object.assign(params, {
          toAddress: this.transData.toAddress,
          amount: this.transData.amount,
          fromAddress: this.address,
          xdr: await this.getXdr({
            encryptedTransData: encryptData,
          }),
        });
      }
    }

    const action = this.transData ? "send" : "connect";

    const url = this.createDeeplinkUrl(action, params);

    // if (this.platform === "web") {
    //   window.location.href = url;
    // } else {
    Linking.openURL(url).catch((err) => {
      if (Platform.OS === "android") {
        Linking.openURL(
          "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN"
        );
      } else {
        Linking.openURL(
          "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        );
      }
      this.ws.close();
    });
    // }
  }

  async signTransaction(transData, timeout = 300000) {
    try {
      const walletData = await AsyncStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      this.address = walletAddress;
      this.transData = transData;

      // Register transaction session
      await this.registerSession("transaction");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {});

        let heartbeatIntervalId;
        const HEARTBEAT_INTERVAL = 30000;

        // Add connection status logging
        this.ws.on("connecting", () => {
          console.log("Socket attempting connection...");
        });

        this.ws.on("connect_attempt", () => {
          console.log("Socket connection attempt...");
        });

        const closeWebSocket = (reason = "Client closing connection") => {
          if (this.ws) {
            this.ws.close();
          }
          if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        };

        this.ws.on("connect", () => {
          this.ws.emit("subscribe", {
            sessionId: this.sessionId,
            action: "transaction",
            transData: this.transData,
            walletAddress: this.address,
          });
          this.sendOpenWallet();
          heartbeatIntervalId = setInterval(() => {
            if (this.ws.connected) {
              console.log("Sending ping...");
              this.ws.emit("ping");
            } else {
              console.log("Socket disconnected, clearing heartbeat");
              clearInterval(heartbeatIntervalId);
            }
          }, HEARTBEAT_INTERVAL);
        });

        this.ws.on("connect_error", (error) => {
          console.error("Connection error:", error);
          console.error("Error details:", {
            message: error.message,
            description: error.description,
            type: error.type,
            context: this.ws.io.engine?.transport,
          });
        });

        this.ws.on("error", (error) => {
          console.error("Socket error:", error);
        });

        this.ws.on("disconnect", (reason) => {
          console.log(`Socket disconnected. Reason: ${reason}`);
          this.startSignTransactionPolling(resolve, reject, timeout);
          clearInterval(heartbeatIntervalId);
        });

        this.ws.on("data", (data) => {
          try {
            switch (data.status) {
              case "sign-completed":
                closeWebSocket("Transaction Signing completed"); // Close WebSocket on success
                resolve(data.data);
                break;
              case "sign-failed":
                closeWebSocket("Transaction Signing failed"); // Close WebSocket on failure
                reject(new Error(data.error));
                break;
              case "sign-cancelled":
                closeWebSocket("Signing cancelled"); // Close WebSocket on cancellation
                reject(new Error(data.error));
                break;
              case "sign-processing":
                resolve(data);
                break;
              case "sign-transaction":
                resolve(data);
                break;
              default:
                console.log("Unknown signing status:");
            }
          } catch (error) {
            closeWebSocket("Error processing signing message");
            reject(error);
          }
        });

        this.ws.onerror = (error) => {
          closeWebSocket("Transaction Signing failed");
          this.startTransactionPolling(resolve, reject, timeout);
        };

        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            closeWebSocket("Transaction Signing timeout");
          }
          reject(new Error("Transaction Signing timeout"));
        }, timeout);
      });
    } catch (error) {
      console.error("Signing error:", error);
      throw new Error(`Transaction Signing failed: ${error.message}`);
    }
  }

  startPolling(resolve, reject, timeout) {
    const startTime = Date.now();
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.serverUrl}/api/session/check-connection/${this.sessionId}`
        );
        const data = await response.json();

        if (data.status === true) {
          clearInterval(this.pollInterval);
          await AsyncStorage.setItem(
            "DIAMWALLETDATA",
            JSON.stringify({ walletAddress: data.address })
          );
          this.ws.disconnect();

          resolve({ status: true, address: data.address }); //
        } else if (Date.now() - startTime > timeout) {
          clearInterval(this.pollInterval);
          reject(new Error("Connection timeout"));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);
  }

  startTransactionPolling(resolve, reject, timeout) {
    const startTime = Date.now();

    const closeWebSocket = (reason = "Client closing connection") => {
      if (this.ws) {
        this.ws.close();
        clearInterval(this.pollInterval);
      }
      // if (timeoutId) clearTimeout(timeoutId);
    };

    this.pollInterval = setInterval(async () => {
      try {
        console.log(
          `${this.serverUrl}/api/transaction/check-transaction/${this.sessionId}`
        );
        const response = await fetch(
          `${this.serverUrl}/api/transaction/check-transaction/${this.sessionId}`
        );
        const data = await response.json();
        switch (data.status) {
          case "completed":
            closeWebSocket("Transaction completed");
            resolve(data.data);
            break;
          case "failed":
            closeWebSocket("Transaction failed");
            clearInterval(this.pollInterval);
            reject(new Error(data.error));
            break;
          case "cancelled":
            closeWebSocket("Transaction cancelled");
            clearInterval(this.pollInterval);
            reject(new Error(data.error));
            break;
          case "processing":
            resolve(data);
            break;
          default:
            console.log("Unknown transaction status:", data);
        }
      } catch (error) {
        clearInterval(this.pollInterval);
        reject(error);
      }
    }, 2000);
  }

  startSignTransactionPolling(resolve, reject, timeout) {
    const startTime = Date.now();

    const closeWebSocket = (reason = "Client closing connection") => {
      if (this.ws) {
        this.ws.close();
        clearInterval(this.pollInterval);
      }
    };

    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.serverUrl}/api/transaction/check-signed-transaction/${this.sessionId}`
        );
        const data = await response.json();

        switch (data.status) {
          case "sign-completed":
            closeWebSocket("Transaction Signing completed"); // Close WebSocket on success
            resolve(data.data);
            break;
          case "sign-failed":
            closeWebSocket("Transaction Signing failed"); // Close WebSocket on failure
            reject(new Error(data.error));
            break;
          case "sign-cancelled":
            closeWebSocket("Transaction Signing cancelled"); // Close WebSocket on cancellation
            reject(new Error(data.error));
            break;
          case "sign-processing":
            resolve(data);
            break;
          case "sign-transaction":
            resolve(data);
            break;
          default:
            console.log("Unknown signing status:", data);
        }
      } catch (error) {
        clearInterval(this.pollInterval);
        reject(error);
      }
    }, 2000);
  }

  async getBalance() {
    try {
      const walletData = await AsyncStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      return await getBalanceData({
        address: walletAddress,
        serverUrl: this.serverUrl,
        network: this.network,
      });
    } catch (error) {
      console.error("Balance fetch error:", error);
      throw error;
    }
  }

  async validatePublicAddress(address) {
    const response = await fetch(
      `${this.serverUrl}/api/transaction/wallet-address-validation`,
      {
        method: "POST",
        body: JSON.stringify({
          address: address,
          network: this.network,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    let validData = await response.json();
    if (validData.data.status === 200) {
      return { valid: true };
    } else {
      return { valid: false };
    }
  }
  async validateBep20PublicAddress(address, token) {
    const response = await fetch(
      `${this.serverUrl}/api/transaction/wallet-address-validation`,
      {
        method: "POST",
        body: JSON.stringify({
          address: address,
          network: this.network,
          token: token,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    let validData = await response.json();
    console.log(validData);
    if (validData.data.status === 200) {
      return { valid: true };
    } else {
      return { valid: false };
    }
  }

  async disconnect() {
    try {
      await AsyncStorage.removeItem("DIAMWALLETDATA");
      this.sessionId = null;
      this.transData = null;
      this.address = null;
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  }
}

export default ReactNativeSDK;
