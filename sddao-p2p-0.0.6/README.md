# 0.0.6

# Run bridge

`sddao-p2p-0.0.6_ton_libp2p_web-aarch64 bridge <ip> <port>`   
`sddao-p2p-0.0.6_libp2p_web-aarch64 bridge <ip> <port>`   

# Run peer

`sddao-p2p-0.0.6_ton_libp2p_web-aarch64 Qob <ip> <port>`  
`sddao-p2p-0.0.6_libp2p_web-aarch64 Qob <ip> <port>` 

# Run web

`pnpm i`, `pnpm run dev` or `pnpm run build && pnpm run preview` or build standalone app using `Neutralino.js` or something like that

# Connect via web

Enter address from bridge, press `Generate keys` button, TON shadow node will autorun, then connect to another node via public key `connect=<peer_public_key>`, then just enter message and send to another peer some data

# Available features

1. Messages, web to web, web to cli (tested with 0.0.2 & 0.0.5 version, working charming, should work with 0.0.3, 0.0.4 also)
2. AI requests – wip, will work as in CLI version (0.0.3 & 0.0.4)

# Compatibility

0.0.6 libp2p won't work with 0.0.2 ton cli version e.g

# Changelog

* Improved frontend streaming – now using libp2p `node.handle` instead of manual stream control.
* Minor updates across TON + libp2p + web integration (compatibility with `node.handle`).
* Added support for pure libp2p usage.
* Web frontend now seamlessly supports both versions across each backend module.