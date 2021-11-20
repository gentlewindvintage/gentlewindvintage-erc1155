// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

import {IProxyRegistry} from "../interfaces/IProxyRegistry.sol";

contract ProxyRegistryMock is IProxyRegistry {
    mapping(address => address) public override proxies;

    function set(address key, address value) public virtual {
        proxies[key] = value;
    }
}
