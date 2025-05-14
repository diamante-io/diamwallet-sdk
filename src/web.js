// WebDIAMWalletSDK.js

import { encrypt, getBalanceData } from "./utils/commonFunctions";

const { io } = require("socket.io-client");

class WebSDK {
  constructor(options) {
    this.serverUrl = options.serverUrl || "https://dwsprod.diamante.io";
    this.appCallback = options.appCallback;
    this.scheme = "diamwallet";
    this.ws = null;
    this.sessionId = null;
    this.pollInterval = null;
    this.disconnected = null;
    this.appName = options.appName;
    this.browser = this.detectBrowser();
    this.platform = options.platform;
    this.transData = null;
    this.address = null;
    this.xdrData = null;
    this.reconnectTimeout = null;
    this.network = options.network;
  }

  detectBrowser() {
    const userAgent = navigator.userAgent;
    let browserName = "Unknown";
    let browserVersion = "Unknown";

    if (/Chrome/.test(userAgent) && !/Chromium|Edge|Edg/.test(userAgent)) {
      browserName = "Chrome";
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (/Firefox/.test(userAgent)) {
      browserName = "Firefox";
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (/Safari/.test(userAgent) && !/Chrome/.test(userAgent)) {
      browserName = "Safari";
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (/Edg/.test(userAgent)) {
      browserName = "Edge";
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    } else if (/OPR/.test(userAgent)) {
      browserName = "Opera";
      const match = userAgent.match(/OPR\/(\d+\.\d+)/);
      browserVersion = match ? match[1] : "Unknown";
    }

    return { name: browserName, version: browserVersion };
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
    try {
      if (!this.sessionId) {
        throw new Error("No active session. Call registerSession first.");
      }

      // Create the deep link URL for the DIAM Wallet
      const url = this.createDeeplinkUrl("connect", {
        appName: this.appName,
        sessionId: this.sessionId,
        callback: this.appCallback,
        browser: JSON.stringify(this.browser),
        platform: this.platform,
        network: this.network,
      });

      // Detect iOS device and Safari
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );

      // App store fallback URL
      const appStoreUrl = isIOS
        ? "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        : "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN";

      // Control flag to track app opening
      let appOpened = false;

      // Visibility change handler
      const handleVisibilityChange = () => {
        if (document.hidden && !appOpened) {
          appOpened = true;

          cleanup();
        }
      };

      // Add visibility change listener
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Timeout for fallback to app store
      const timeoutId = setTimeout(() => {
        if (!appOpened) {
          appOpened = true;
          window.location.href = appStoreUrl;
        }
        cleanup();
      }, 3000); // 3-second timeout

      // Attempt to open the app
      if (!appOpened) {
        if (isSafari && isIOS) {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (isIOS && !isSafari) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);

          // Remove the iframe after some time
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } else {
          const link = document.createElement("a");
          link.setAttribute("href", url);

          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Error in openWallet:", error);
    }
  }

  openSignWallet() {
    try {
      if (!this.sessionId) {
        throw new Error("No active session. Call registerSession first.");
      }

      // Create the deep link URL for the DIAM Wallet
      const url = this.createDeeplinkUrl("connect", {
        appName: this.appName,
        sessionId: this.sessionId,
        callback: this.appCallback,
        browser: JSON.stringify(this.browser),
        platform: this.platform,
        network: this.network,
        xdrData: this.xdrData.xdr,
        address: this.xdrData.address,
        sign: true,
      });

      // Detect iOS device and Safari
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );

      // Control flag to track app opening
      let appOpened = false;

      // Visibility change handler
      const handleVisibilityChange = () => {
        if (document.hidden && !appOpened) {
          appOpened = true;
          cleanup();
        }
      };

      // Timeout for fallback to app store

      // Add visibility change listener
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Attempt to open the app directly
      if (!appOpened) {
        if (isSafari && isIOS) {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (isIOS && !isSafari) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } else {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    } catch (error) {
      console.error("Error in openWallet:", error);
    }
  }

  async initializeSdk() {
    const existingDta = JSON.parse(sessionStorage.getItem("DIAMWALLETDATA"));
    if (existingDta === null) {
      // this.openWallet();
      return null;
    } else {
      return { address: existingDta.walletAddress, status: true };
    }
  }

  // Add visibility change listener
  async connectWallet(timeout = 300000) {
    try {
      await this.registerSession("wallet");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {
          origin: window.location.origin,
          transports: ["websocket", "polling"], // Allow fallback transport
          reconnection: false,
        });

        console.log(this.ws, "[=======");
        let heartbeatIntervalId;
        let connectionTimeoutId;
        let hasReceivedData = false; // Flag to check if data was received
        const HEARTBEAT_INTERVAL = 30000;
        const POLLING_TIMEOUT = 30000; // 30 seconds

        const handleSocketEvent = (event, data) => {
          switch (event) {
            case "connect":
              console.log("Socket connected!");
              this.ws.emit(
                "subscribe",
                { sessionId: this.sessionId, action: "connect" },
                (ack) => console.log("Subscribe acknowledgement:", ack)
              );
              this.openWallet();

              clearTimeout(connectionTimeoutId); // Clear timeout on success

              heartbeatIntervalId = setInterval(() => {
                if (this.ws.connected) {
                  console.log("Sending ping...");
                  this.ws.emit("ping");
                } else {
                  console.log("Socket disconnected, clearing heartbeat");
                  clearInterval(heartbeatIntervalId);
                }
              }, HEARTBEAT_INTERVAL);
              break;

            case "connect_error":
              console.error("Connection error:", data);

              if (hasReceivedData) {
                console.warn(
                  "Transport error occurred, but data was already received. Ignoring."
                );
              } else {
                console.warn(
                  "Transport error occurred, starting polling for 30 seconds..."
                );
                this.startPolling(resolve, reject, POLLING_TIMEOUT);
              }
              break;

            case "disconnect":
              console.warn(`Socket disconnected. Reason: ${data}`);
              clearInterval(heartbeatIntervalId);
              if (!hasReceivedData) {
                console.warn("Starting polling after unexpected disconnect...");
                this.startPolling(resolve, reject, POLLING_TIMEOUT);
              }
              break;

            case "data":
              console.log("Received data:", data);
              hasReceivedData = true; // Mark that data was successfully received
              try {
                if (data.status === true) {
                  sessionStorage.setItem(
                    "DIAMWALLETDATA",
                    JSON.stringify({ walletAddress: data.address })
                  );
                  this.ws.close();
                  resolve(data);
                } else {
                  console.warn("Wallet connection failed");
                  this.ws.close();
                  reject(new Error("Failed to connect wallet"));
                }
              } catch (error) {
                console.error("Error processing data:", error);
                reject(error);
              }
              break;

            default:
              console.warn(`Unhandled event: ${event}`);
          }
        };

        // Assign event listeners using the switch function
        this.ws.on("connect", () => handleSocketEvent("connect"));
        this.ws.on("connect_error", (error) =>
          handleSocketEvent("connect_error", error)
        );
        this.ws.on("disconnect", (reason) =>
          handleSocketEvent("disconnect", reason)
        );
        this.ws.on("data", (data) => handleSocketEvent("data", data));

        // Handle timeout
        connectionTimeoutId = setTimeout(() => {
          if (!this.ws.connected) {
            console.warn("Connection timeout reached");
            this.ws.close();
            reject(new Error("Connection timeout"));
          }
        }, timeout);
      });
    } catch (error) {
      console.error("Error during session registration:", error);
      throw error;
    }
  }

  async sign(signData, timeout = 300000) {
    try {
      // Delay execution by 3 seconds
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await this.registerSession("wallet");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {
          origin: window.location.origin,
          transports: ["websocket", "polling"], // Allow fallback transport
          reconnection: false,
        });

        this.xdrData = signData;
        let heartbeatIntervalId;
        let connectionTimeoutId;
        let pollingTimeoutId;
        let dataReceived = false; // Flag to track received data
        const HEARTBEAT_INTERVAL = 30000;
        const POLLING_TIMEOUT = 30000; // 30 seconds

        const handleSocketEvent = (event, data) => {
          switch (event) {
            case "connect":
              console.log("Connected to socket");
              this.ws.emit(
                "subscribe",
                { sessionId: this.sessionId, action: "connect" },
                (ack) => console.log("Subscribe acknowledgement:", ack)
              );

              this.openSignWallet();
              clearTimeout(connectionTimeoutId); // Clear timeout on success

              heartbeatIntervalId = setInterval(() => {
                if (this.ws.connected) {
                  console.log("Sending ping...");
                  this.ws.emit("ping");
                } else {
                  console.log("Socket disconnected, clearing heartbeat");
                  clearInterval(heartbeatIntervalId);
                }
              }, HEARTBEAT_INTERVAL);
              break;

            case "connect_error":
              console.error("Connection error:", data);

              if (dataReceived) {
                console.warn(
                  "Transport error occurred, but data was already received. Ignoring."
                );
              } else {
                console.warn(
                  "Transport error occurred, starting polling for 30 seconds..."
                );
                pollingTimeoutId = this.startSignPolling(
                  resolve,
                  reject,
                  POLLING_TIMEOUT
                );
              }
              break;

            case "disconnect":
              console.warn(`Socket disconnected. Reason: ${data}`);
              clearInterval(heartbeatIntervalId);

              if (!dataReceived) {
                console.warn("No data received, starting polling...");
                pollingTimeoutId = this.startSignPolling(
                  resolve,
                  reject,
                  POLLING_TIMEOUT
                );
              } else {
                console.warn("Data was received, skipping polling...");
              }
              break;

            case "data":
              console.log("Received data:", data);
              dataReceived = true; // Mark that data has been received
              try {
                if (pollingTimeoutId) {
                  clearTimeout(pollingTimeoutId);
                  pollingTimeoutId = null;
                }

                if (data.status === true) {
                  this.ws.close();
                  resolve(data);
                } else {
                  reject(new Error("Signing failed"));
                }
              } catch (error) {
                console.error("Error processing data:", error);
                reject(error);
              }
              break;

            default:
              console.warn(`Unhandled event: ${event}`);
          }
        };

        // Assign event listeners
        this.ws.on("connect", () => handleSocketEvent("connect"));
        this.ws.on("connect_error", (error) =>
          handleSocketEvent("connect_error", error)
        );
        this.ws.on("disconnect", (reason) =>
          handleSocketEvent("disconnect", reason)
        );
        this.ws.on("data", (data) => handleSocketEvent("data", data));

        // Handle timeout
        connectionTimeoutId = setTimeout(() => {
          if (!this.ws.connected) {
            console.warn("Connection timeout reached");
            this.ws.close();
            reject(new Error("Connection timeout"));
          }
        }, timeout);
      });
    } catch (error) {
      console.error("Error during session registration:", error);
      throw error;
    }
  }

  startSignPolling(resolve, reject, timeout) {
    const startTime = Date.now();
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.serverUrl}/api/session/check-connection/${this.sessionId}`
        );
        const data = await response.json();
        console.log("Polling response:", data);

        // If the session is not found, stop polling and reject
        if (data.error === "Session not found") {
          console.warn("Session not found. Stopping polling.");
          clearInterval(this.pollInterval);
          reject(new Error("Session not found"));
          return; // Exit function immediately
        }

        if (data.status === true) {
          clearInterval(this.pollInterval);
          resolve(data);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(this.pollInterval);
          reject(new Error("Polling timeout reached"));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds
  }

  async sendTransaction(transData, timeout = 300000) {
    try {
      const walletData = sessionStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      this.address = walletAddress;
      this.transData = transData;

      // Register transaction session
      await this.registerSession("transaction");

      // Open wallet for transaction

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {
          origin: window.location.origin,
          transports: ["websocket"],
          reconnection: false,
        });

        console.log(this.ws);

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

          // Start heartbeat
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
          this.startTransactionPolling(resolve, reject, timeout);
          clearInterval(heartbeatIntervalId);
        });

        // Handle incoming data
        this.ws.on("data", (data) => {
          try {
            // Handle "pong" response for the heartbeat

            switch (data.status) {
              case "completed":
                closeWebSocket("Transaction completed");
                resolve(data.data);
                break;
              case "failed":
                closeWebSocket("Transaction failed");
                reject(new Error(data.error));
                break;
              case "cancelled":
                closeWebSocket("Transaction cancelled");
                reject(new Error(data.error));
                break;
              case "processing":
                resolve(data);
                break;
              default:
                console.log("Unknown transaction status:", data);
            }
          } catch (error) {
            console.error("WebSocket message handling error:", error);
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
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  async signTransaction(transData, timeout = 300000) {
    try {
      const walletData = sessionStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      const { walletAddress } = JSON.parse(walletData);
      this.address = walletAddress;
      this.transData = transData;

      // Register transaction session
      await this.registerSession("transaction");

      return new Promise((resolve, reject) => {
        this.ws = io(this.serverUrl, {
          origin: window.location.origin,
          transports: ["websocket"],
          reconnection: false,
        });

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
          // Send initial subscription message
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

          // Start heartbeat
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
            closeWebSocket("Error processing signing message");
            reject(error);
          }
        });

        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            console.warn("Transaction Signing timeout.");
            closeWebSocket("Transaction Signing timeout.");
          }
          reject(new Error("Transaction Signing timeout"));
        }, timeout);
      });
    } catch (error) {
      throw new Error(`Transaction Signing failed: ${error.message}`);
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

  handleReconnect() {
    console.warn("Attempting to reconnect...");
    clearTimeout(this.reconnectTimeout);

    this.reconnectTimeout = setTimeout(() => {
      this.connect(); // Try to reconnect after a delay
    }, 5000); // Reconnect after 5 seconds
  }

  async sendOpenWallet() {
    try {
      if (!this.sessionId) {
        throw new Error("No active session. Call registerSession first.");
      }

      const params = {
        sessionId: this.sessionId,
        callback: this.appCallback,
        appName: this.appName,
        xdr: this.xdrData,
        signTransaction: this.transData.signTransaction,
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

      // Detect iOS device and Safari
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );

      // App store fallback URL
      const appStoreUrl = isIOS
        ? "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        : "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN";

      // Control flag to track app opening
      let appOpened = false;

      // Visibility change handler
      const handleVisibilityChange = () => {
        if (document.hidden && !appOpened) {
          appOpened = true;

          cleanup();
        }
      };

      // Add visibility change listener
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Timeout for fallback to app store
      const timeoutId = setTimeout(() => {
        if (!appOpened) {
          appOpened = true;
          window.location.href = appStoreUrl;
        }
        cleanup();
      }, 3000); // 3-second timeout

      // Attempt to open the app
      if (!appOpened) {
        if (isSafari && isIOS) {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (isIOS && !isSafari) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);

          // Remove the iframe after some time
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } else {
          window.location.href = url;
        }
      }

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Error in openWallet:", error);
    }
  }

  async sendBep20OpenWallet() {
    try {
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
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );

      // App store fallback URL
      const appStoreUrl = isIOS
        ? "https://apps.apple.com/in/app/diam-wallet/id6450691849"
        : "https://play.google.com/store/apps/details?id=com.diamante.diamwallet&hl=en_IN";

      // Control flag to track app opening
      let appOpened = false;

      // Visibility change handler
      const handleVisibilityChange = () => {
        if (document.hidden && !appOpened) {
          appOpened = true;

          cleanup();
        }
      };

      // Add visibility change listener
      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Timeout for fallback to app store
      const timeoutId = setTimeout(() => {
        if (!appOpened) {
          appOpened = true;
          window.location.href = appStoreUrl;
        }
        cleanup();
      }, 3000); // 3-second timeout

      // Attempt to open the app
      if (!appOpened) {
        if (isSafari && isIOS) {
          const link = document.createElement("a");
          link.setAttribute("href", url);
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (isIOS && !isSafari) {
          const iframe = document.createElement("iframe");
          iframe.style.display = "none";
          iframe.src = url;
          document.body.appendChild(iframe);

          // Remove the iframe after some time
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        } else {
          window.location.href = url;
        }
      }

      // Cleanup function
      const cleanup = () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.error("Error in openWallet:", error);
    }
  }

  async sendBEP20Transaction(transData, timeout = 300000) {
    try {
      const walletData = sessionStorage.getItem("DIAMWALLETDATA");
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

  startPolling(resolve, reject, timeout) {
    const startTime = Date.now();
    this.pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${this.serverUrl}/api/session/check-connection/${this.sessionId}`
        );
        const data = await response.json();
        console.log("Polling response:", data);

        // If the session is not found, stop polling and reject
        if (data.error === "Session not found") {
          console.warn("Session not found. Stopping polling.");
          clearInterval(this.pollInterval);
          reject(new Error("Session not found"));
          return; // Exit function immediately
        }

        if (data.status === true) {
          clearInterval(this.pollInterval);
          sessionStorage.setItem(
            "DIAMWALLETDATA",
            JSON.stringify({ walletAddress: data.address })
          );
          resolve(data);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(this.pollInterval);
          reject(new Error("Polling timeout reached"));
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000); // Poll every 2 seconds
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
        const response = await fetch(
          `${this.serverUrl}/api/transaction/check-transaction/${this.sessionId}`
        );
        const data = await response.json();
        console.log(data);

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
      const walletData = sessionStorage.getItem("DIAMWALLETDATA");
      if (!walletData) {
        throw new Error("No wallet data found");
      }

      console.log(walletData);

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
        body: JSON.stringify({ address: address, network: this.network }),
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
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.disconnected = false;
        this.ws.close();
      }
      if (this.pollInterval) {
        clearInterval(this.pollInterval);
      }
      sessionStorage.removeItem("DIAMWALLETDATA");
      this.sessionId = null;
      this.transData = null;
      this.address = null;
    } catch (error) {
      console.error("Disconnect error:", error);
      throw error;
    }
  }

  getBrowserInfo() {
    return this.browser;
  }
}

export default WebSDK;
