az webapp deployment slot swap --resource-group rg-lock-api-$1 --name app-lock-node-inp-$1 --slot stg
az webapp deployment slot swap --resource-group rg-lock-api-$1 --name app-lock-node-rew-$1 --slot stg
az webapp deployment slot swap --resource-group rg-lock-api-$1 --name app-lock-node-liq-$1 --slot stg
