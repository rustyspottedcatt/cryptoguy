import "dotenv/config";
import http from "http";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import { VerifyDiscordRequest } from "./utils.js";
import axios from "axios";

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  console.log(`Received request: ${req.method} ${req.url}`);

  if (req.method === 'POST' && req.url === '/interactions') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(body);

        try {
          VerifyDiscordRequest(process.env.PUBLIC_KEY)(req, res, Buffer.from(body));
          console.log("Request verified successfully.");
        } catch (verificationError) {
          console.error("Request verification failed:", verificationError);
          res.writeHead(401);
          return res.end("Bad request signature");
        }

        const { type, data } = parsedBody;

        if (type === InteractionType.PING) {
          console.log("Received a PING interaction.");
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ type: InteractionResponseType.PONG }));
        }

        if (type === InteractionType.APPLICATION_COMMAND) {
          const { name } = data;
          if (name === "crypto") {
            const option = data.options[0];
            const cryptoSymbol = option.value.toUpperCase();

            try {
              const binanceData = await getBinanceData(cryptoSymbol);
              const logoUrl = await getCryptoCompareLogoUrl(cryptoSymbol);

              if (!binanceData) {
                console.error(`Symbol not found: ${cryptoSymbol}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                  data: {
                    content: `Sorry, I couldn't find a cryptocurrency with the symbol "${cryptoSymbol}".`,
                  },
                }));
              }

              const price = parseFloat(binanceData.lastPrice).toFixed(4);
              const change24h = parseFloat(binanceData.priceChange).toFixed(4);
              const change24hPercent = parseFloat(binanceData.priceChangePercent).toFixed(2);
              const low24h = parseFloat(binanceData.lowPrice).toFixed(4);
              const high24h = parseFloat(binanceData.highPrice).toFixed(4);

              const timestamp = new Date().toLocaleString("en-US", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "UTC",
              });

              console.log(`Responding with data for ${cryptoSymbol}.`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  embeds: [
                    {
                      title: `${cryptoSymbol}`,
                      color: 0x007bff,
                      fields: [
                        {
                          name: "Price",
                          value: `$${price} USD`,
                          inline: false,
                        },
                        {
                          name: "24H Change",
                          value: `${change24h > 0 ? '+' : ''}$${change24h} (${change24hPercent}%)`,
                          inline: false,
                        },
                        {
                          name: "24H Low",
                          value: `$${low24h}`,
                          inline: false,
                        },
                        {
                          name: "24H High",
                          value: `$${high24h}`,
                          inline: false,
                        },
                      ],
                      footer: {
                        text: `${cryptoSymbol} • ${timestamp}`,
                      },
                      thumbnail: {
                        url: logoUrl,
                      },
                    },
                  ],
                },
              }));
            } catch (error) {
              console.error(`Error handling crypto command: ${error.message}`);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                  content: `Sorry, I couldn't retrieve information for "${cryptoSymbol}". Please check the name and try again.`,
                },
              }));
            }
          }
        }
      } catch (parseError) {
        console.error("Error parsing request body:", parseError);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: "Invalid request body" }));
      }
    });
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${PORT}`);
});

async function getBinanceData(symbol) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching data from Binance:", error);
    return null;
  }
}

async function getCryptoCompareLogoUrl(symbol) {
  try {
    const response = await axios.get(
      `https://min-api.cryptocompare.com/data/all/coinlist?summary=true&api_key=f65ae9482c12aa30f67c93e6f399b096e42c41c3eae6f1cbff2da5899a9a9bbe`
    );
    const coinData = response.data.Data[symbol.toUpperCase()];
    return coinData ? `https://www.cryptocompare.com${coinData.ImageUrl}` : null;
  } catch (error) {
    console.error("Error fetching logo from CryptoCompare:", error);
    return null;
  }
}
