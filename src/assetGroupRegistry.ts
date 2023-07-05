import {BigInt, crypto, ByteArray } from "@graphprotocol/graph-ts";

import {
    AssetGroupRegistered,
    AssetGroupRegistryContract,
} from "../generated/AssetGroupRegistry/AssetGroupRegistryContract";
import {AssetGroup, AssetGroupToken} from "../generated/schema";
import {createTokenEntity, getComposedId, logEventName} from "./utils/helpers";

export function handleAssetGroupRegistered(event: AssetGroupRegistered): void {
    logEventName("handleAssetGroupRegistered", event);

    let assetGroup = getAssetGroup(event.params.assetGroupId);

    let assetGroupRegistry = AssetGroupRegistryContract.bind(event.address);
    let tokens = assetGroupRegistry.listAssetGroup(event.params.assetGroupId);

    let assetGroupTokens = assetGroup.assetGroupTokens;
    for (let i = 0; i < tokens.length; i++) {
        let token = createTokenEntity(tokens[i].toHexString());
        let assetGroupToken = getAssetGroupToken(assetGroup.id, token.id);

        assetGroupTokens.push(assetGroupToken.id);
    }

    assetGroup.assetGroupTokens = assetGroupTokens;
    assetGroup.save();
}

function getAssetGroup(assetGroupId: BigInt): AssetGroup {
    let assetGroup = AssetGroup.load(assetGroupId.toString());

    if (assetGroup == null) {
        assetGroup = new AssetGroup(assetGroupId.toString());
        assetGroup.assetGroupTokens = [];
        assetGroup.save();
    }

    return assetGroup;
}

function getAssetGroupToken(assetGroupId: string, tokenAddress: string): AssetGroupToken {
    let assetGroupTokenId = getComposedId(assetGroupId, tokenAddress);
    let assetGroupToken = AssetGroupToken.load(assetGroupTokenId);

    if (assetGroupToken == null) {
        assetGroupToken = new AssetGroupToken(assetGroupTokenId);
        assetGroupToken.assetGroup = assetGroupId;
        assetGroupToken.token = tokenAddress;
        assetGroupToken.save();
    }

    return assetGroupToken;
}
