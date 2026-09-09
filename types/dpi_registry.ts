/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/dpi_registry.json`.
 */
export type DpiRegistry = {
  "address": "CEyRA234cQ3u3KCjE2tRzobZQg7GgyhQBL11JTWA9WVc",
  "metadata": {
    "name": "dpiRegistry",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "batchReserveHandles",
      "discriminator": [
        223,
        204,
        240,
        153,
        226,
        161,
        98,
        192
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "handles",
          "type": {
            "vec": "string"
          }
        }
      ]
    },
    {
      "name": "freezeHandle",
      "discriminator": [
        126,
        186,
        34,
        174,
        237,
        149,
        231,
        159
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "handleRegistry",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "initConfig",
      "discriminator": [
        23,
        235,
        115,
        232,
        168,
        96,
        1,
        231
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "recoverHandle",
      "discriminator": [
        71,
        139,
        99,
        85,
        249,
        87,
        229,
        243
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "handleRegistry",
          "writable": true
        },
        {
          "name": "oldReverseLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "handle_registry.owner",
                "account": "handleRegistry"
              }
            ]
          }
        },
        {
          "name": "newReverseLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "newOwner"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newOwner",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "registerHandle",
      "discriminator": [
        15,
        173,
        21,
        158,
        125,
        204,
        221,
        29
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "handleRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  97,
                  110,
                  100,
                  108,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "handle"
              }
            ]
          }
        },
        {
          "name": "reverseLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "reservedHandle",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "handle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "handle",
          "type": "string"
        }
      ]
    },
    {
      "name": "reserveHandle",
      "discriminator": [
        207,
        57,
        189,
        58,
        44,
        182,
        144,
        13
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "reservedHandle",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "handle"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "handle",
          "type": "string"
        }
      ]
    },
    {
      "name": "transferHandle",
      "discriminator": [
        205,
        82,
        18,
        134,
        165,
        126,
        5,
        18
      ],
      "accounts": [
        {
          "name": "currentOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "handleRegistry",
          "writable": true
        },
        {
          "name": "owner",
          "relations": [
            "handleRegistry"
          ]
        },
        {
          "name": "oldReverseLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "currentOwner"
              }
            ]
          }
        },
        {
          "name": "newReverseLookup",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  118,
                  101,
                  114,
                  115,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "newOwner"
              }
            ]
          }
        },
        {
          "name": "newOwner"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unfreezeHandle",
      "discriminator": [
        184,
        67,
        141,
        90,
        193,
        164,
        11,
        129
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "handleRegistry",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "updateConfig",
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "newAdmin"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "handleRegistry",
      "discriminator": [
        120,
        46,
        76,
        126,
        63,
        168,
        217,
        232
      ]
    },
    {
      "name": "registryConfig",
      "discriminator": [
        23,
        118,
        10,
        246,
        173,
        231,
        243,
        156
      ]
    },
    {
      "name": "reservedHandle",
      "discriminator": [
        56,
        73,
        168,
        21,
        191,
        136,
        222,
        232
      ]
    },
    {
      "name": "reverseLookup",
      "discriminator": [
        229,
        71,
        23,
        218,
        108,
        105,
        141,
        76
      ]
    }
  ],
  "events": [
    {
      "name": "configUpdated",
      "discriminator": [
        40,
        241,
        230,
        122,
        11,
        19,
        198,
        194
      ]
    },
    {
      "name": "handleFrozen",
      "discriminator": [
        113,
        106,
        8,
        145,
        201,
        35,
        41,
        246
      ]
    },
    {
      "name": "handleRecovered",
      "discriminator": [
        36,
        198,
        238,
        198,
        93,
        61,
        147,
        169
      ]
    },
    {
      "name": "handleRegistered",
      "discriminator": [
        198,
        199,
        131,
        143,
        155,
        179,
        118,
        191
      ]
    },
    {
      "name": "handleReserved",
      "discriminator": [
        114,
        156,
        154,
        250,
        233,
        155,
        30,
        30
      ]
    },
    {
      "name": "handleTransferred",
      "discriminator": [
        60,
        54,
        173,
        179,
        246,
        184,
        172,
        39
      ]
    },
    {
      "name": "handleUnfrozen",
      "discriminator": [
        113,
        20,
        201,
        192,
        199,
        118,
        99,
        59
      ]
    },
    {
      "name": "reverseLookupCreated",
      "discriminator": [
        219,
        47,
        36,
        35,
        151,
        176,
        179,
        126
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "handleTooShort",
      "msg": "Handle too short"
    },
    {
      "code": 6001,
      "name": "handleTooLong",
      "msg": "Handle too long"
    },
    {
      "code": 6002,
      "name": "reservedHandle",
      "msg": "Reserved handle"
    },
    {
      "code": 6003,
      "name": "unauthorizedAdmin",
      "msg": "Unauthorized admin"
    },
    {
      "code": 6004,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6005,
      "name": "handleFrozen",
      "msg": "Handle is frozen"
    },
    {
      "code": 6006,
      "name": "handleAlreadyReserved",
      "msg": "Handle already reserved"
    },
    {
      "code": 6007,
      "name": "handleNotFound",
      "msg": "Handle not found"
    },
    {
      "code": 6008,
      "name": "tooManyHandles",
      "msg": "Too many handles"
    },
    {
      "code": 6009,
      "name": "invalidHandle",
      "msg": "Invalid handle"
    },
    {
      "code": 6010,
      "name": "handleAlreadyOwned",
      "msg": "Wallet already owns a handle"
    }
  ],
  "types": [
    {
      "name": "configUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldAdmin",
            "type": "pubkey"
          },
          {
            "name": "newAdmin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "handleFrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "handleRecovered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "handle",
            "type": "string"
          },
          {
            "name": "newOwner",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "handleRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "handleRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "frozen",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "handleReserved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "handleTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldOwner",
            "type": "pubkey"
          },
          {
            "name": "newOwner",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "handleUnfrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "registryConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "reservedHandle",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "reverseLookup",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "reverseLookupCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "handle",
            "type": "string"
          }
        ]
      }
    }
  ]
};
