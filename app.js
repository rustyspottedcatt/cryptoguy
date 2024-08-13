import "dotenv/config";
import express from "express";
import { InteractionType, InteractionResponseType } from "discord-interactions";
import { VerifyDiscordRequest } from "./utils.js";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ verify: VerifyDiscordRequest(process.env.PUBLIC_KEY) }));

async function getBinanceData(symbol) {
  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}USDT`
    );

    if (response.data) {
      return response.data;
    } else {
      console.error("Symbol not found on Binance");
      return null;
    }
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

    if (response.data && response.data.Data && response.data.Data[symbol.toUpperCase()]) {
      const coinData = response.data.Data[symbol.toUpperCase()];
      return `https://www.cryptocompare.com${coinData.ImageUrl}`;
    } else {
      console.error("Logo not found on CryptoCompare");
      return null;
    }
  } catch (error) {
    console.error("Error fetching logo from CryptoCompare:", error);
    return null;
  }
}
app.post("/interactions", async function (req, res) {
  const { type, data } = req.body;

  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
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
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Sorry, I couldn't find a cryptocurrency with the symbol "${cryptoSymbol}".`,
            },
          });
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

        return res.send({
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
        });
      } catch (error) {
        console.error(error);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Sorry, I couldn't retrieve information for "${cryptoSymbol}". Please check the name and try again.`,
          },
        });
      }
    }
  }
});

app.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
