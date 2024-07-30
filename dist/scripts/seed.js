"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return seedDemoData;
    }
});
const _coreflows = require("@medusajs/core-flows");
const _utils = require("@medusajs/utils");
async function seedDemoData({ container }) {
    const logger = container.resolve(_utils.ContainerRegistrationKeys.LOGGER);
    const remoteLink = container.resolve(_utils.ContainerRegistrationKeys.REMOTE_LINK);
    const fulfillmentModuleService = container.resolve(_utils.ModuleRegistrationName.FULFILLMENT);
    const salesChannelModuleService = container.resolve(_utils.ModuleRegistrationName.SALES_CHANNEL);
    const storeModuleService = container.resolve(_utils.ModuleRegistrationName.STORE);
    const countries = [
        "gb",
        "de",
        "dk",
        "se",
        "fr",
        "es",
        "it"
    ];
    logger.info("Seeding store data...");
    const [store] = await storeModuleService.listStores();
    let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Default Sales Channel"
    });
    if (!defaultSalesChannel.length) {
        // create the default sales channel
        const { result: salesChannelResult } = await (0, _coreflows.createSalesChannelsWorkflow)(container).run({
            input: {
                salesChannelsData: [
                    {
                        name: "Default Sales Channel"
                    }
                ]
            }
        });
        defaultSalesChannel = salesChannelResult;
    }
    await (0, _coreflows.updateStoresWorkflow)(container).run({
        input: {
            selector: {
                id: store.id
            },
            update: {
                supported_currencies: [
                    {
                        currency_code: "eur",
                        is_default: true
                    },
                    {
                        currency_code: "usd"
                    }
                ],
                default_sales_channel_id: defaultSalesChannel[0].id
            }
        }
    });
    logger.info("Seeding region data...");
    const { result: regionResult } = await (0, _coreflows.createRegionsWorkflow)(container).run({
        input: {
            regions: [
                {
                    name: "Europe",
                    currency_code: "eur",
                    countries,
                    payment_providers: [
                        "pp_system_default"
                    ]
                }
            ]
        }
    });
    const region = regionResult[0];
    logger.info("Finished seeding regions.");
    logger.info("Seeding tax regions...");
    await (0, _coreflows.createTaxRegionsWorkflow)(container).run({
        input: countries.map((country_code)=>({
                country_code
            }))
    });
    logger.info("Finished seeding tax regions.");
    logger.info("Seeding stock location data...");
    const { result: stockLocationResult } = await (0, _coreflows.createStockLocationsWorkflow)(container).run({
        input: {
            locations: [
                {
                    name: "European Warehouse",
                    address: {
                        city: "Copenhagen",
                        country_code: "DK",
                        address_1: ""
                    }
                }
            ]
        }
    });
    const stockLocation = stockLocationResult[0];
    await remoteLink.create({
        [_utils.Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id
        },
        [_utils.Modules.FULFILLMENT]: {
            fulfillment_provider_id: "manual_manual"
        }
    });
    logger.info("Seeding fulfillment data...");
    const { result: shippingProfileResult } = await (0, _coreflows.createShippingProfilesWorkflow)(container).run({
        input: {
            data: [
                {
                    name: "Default",
                    type: "default"
                }
            ]
        }
    });
    const shippingProfile = shippingProfileResult[0];
    const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
        name: "European Warehouse delivery",
        type: "shipping",
        service_zones: [
            {
                name: "Europe",
                geo_zones: [
                    {
                        country_code: "gb",
                        type: "country"
                    },
                    {
                        country_code: "de",
                        type: "country"
                    },
                    {
                        country_code: "dk",
                        type: "country"
                    },
                    {
                        country_code: "se",
                        type: "country"
                    },
                    {
                        country_code: "fr",
                        type: "country"
                    },
                    {
                        country_code: "es",
                        type: "country"
                    },
                    {
                        country_code: "it",
                        type: "country"
                    }
                ]
            }
        ]
    });
    await remoteLink.create({
        [_utils.Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id
        },
        [_utils.Modules.FULFILLMENT]: {
            fulfillment_set_id: fulfillmentSet.id
        }
    });
    await (0, _coreflows.createShippingOptionsWorkflow)(container).run({
        input: [
            {
                name: "Standard Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Standard",
                    description: "Ship in 2-3 days.",
                    code: "standard"
                },
                prices: [
                    {
                        currency_code: "usd",
                        amount: 10
                    },
                    {
                        currency_code: "eur",
                        amount: 10
                    },
                    {
                        region_id: region.id,
                        amount: 10
                    }
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: '"true"',
                        operator: "eq"
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq"
                    }
                ]
            },
            {
                name: "Express Shipping",
                price_type: "flat",
                provider_id: "manual_manual",
                service_zone_id: fulfillmentSet.service_zones[0].id,
                shipping_profile_id: shippingProfile.id,
                type: {
                    label: "Express",
                    description: "Ship in 24 hours.",
                    code: "express"
                },
                prices: [
                    {
                        currency_code: "usd",
                        amount: 10
                    },
                    {
                        currency_code: "eur",
                        amount: 10
                    },
                    {
                        region_id: region.id,
                        amount: 10
                    }
                ],
                rules: [
                    {
                        attribute: "enabled_in_store",
                        value: '"true"',
                        operator: "eq"
                    },
                    {
                        attribute: "is_return",
                        value: "false",
                        operator: "eq"
                    }
                ]
            }
        ]
    });
    logger.info("Finished seeding fulfillment data.");
    await (0, _coreflows.linkSalesChannelsToStockLocationWorkflow)(container).run({
        input: {
            id: stockLocation.id,
            add: [
                defaultSalesChannel[0].id
            ]
        }
    });
    logger.info("Finished seeding stock location data.");
    logger.info("Seeding publishable API key data...");
    const { result: publishableApiKeyResult } = await (0, _coreflows.createApiKeysWorkflow)(container).run({
        input: {
            api_keys: [
                {
                    title: "Webshop",
                    type: "publishable",
                    created_by: ""
                }
            ]
        }
    });
    const publishableApiKey = publishableApiKeyResult[0];
    await (0, _coreflows.linkSalesChannelsToApiKeyWorkflow)(container).run({
        input: {
            id: publishableApiKey.id,
            add: [
                defaultSalesChannel[0].id
            ]
        }
    });
    logger.info("Finished seeding publishable API key data.");
    logger.info("Seeding product data...");
    const { result: categoryResult } = await (0, _coreflows.createProductCategoriesWorkflow)(container).run({
        input: {
            product_categories: [
                {
                    name: "Shirts",
                    is_active: true
                },
                {
                    name: "Sweatshirts",
                    is_active: true
                },
                {
                    name: "Pants",
                    is_active: true
                },
                {
                    name: "Merch",
                    is_active: true
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa T-Shirt",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Shirts").id
                    ],
                    description: "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
                    handle: "t-shirt",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        },
                        {
                            title: "Color",
                            values: [
                                "Black",
                                "White"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S / Black",
                            sku: "SHIRT-S-BLACK",
                            options: {
                                Size: "S",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "S / White",
                            sku: "SHIRT-S-WHITE",
                            options: {
                                Size: "S",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M / Black",
                            sku: "SHIRT-M-BLACK",
                            options: {
                                Size: "M",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M / White",
                            sku: "SHIRT-M-WHITE",
                            options: {
                                Size: "M",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L / Black",
                            sku: "SHIRT-L-BLACK",
                            options: {
                                Size: "L",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L / White",
                            sku: "SHIRT-L-WHITE",
                            options: {
                                Size: "L",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL / Black",
                            sku: "SHIRT-XL-BLACK",
                            options: {
                                Size: "XL",
                                Color: "Black"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL / White",
                            sku: "SHIRT-XL-WHITE",
                            options: {
                                Size: "XL",
                                Color: "White"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Sweatshirt",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Sweatshirts").id
                    ],
                    description: "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
                    handle: "sweatshirt",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SWEATSHIRT-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SWEATSHIRT-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SWEATSHIRT-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SWEATSHIRT-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Sweatpants",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Pants").id
                    ],
                    description: "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
                    handle: "sweatpants",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SWEATPANTS-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SWEATPANTS-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SWEATPANTS-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SWEATPANTS-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    await (0, _coreflows.createProductsWorkflow)(container).run({
        input: {
            products: [
                {
                    title: "Medusa Shorts",
                    category_ids: [
                        categoryResult.find((cat)=>cat.name === "Merch").id
                    ],
                    description: "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
                    handle: "shorts",
                    weight: 400,
                    status: _utils.ProductStatus.PUBLISHED,
                    images: [
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png"
                        },
                        {
                            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png"
                        }
                    ],
                    options: [
                        {
                            title: "Size",
                            values: [
                                "S",
                                "M",
                                "L",
                                "XL"
                            ]
                        }
                    ],
                    variants: [
                        {
                            title: "S",
                            sku: "SHORTS-S",
                            options: {
                                Size: "S"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "M",
                            sku: "SHORTS-M",
                            options: {
                                Size: "M"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "L",
                            sku: "SHORTS-L",
                            options: {
                                Size: "L"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        },
                        {
                            title: "XL",
                            sku: "SHORTS-XL",
                            options: {
                                Size: "XL"
                            },
                            manage_inventory: false,
                            prices: [
                                {
                                    amount: 10,
                                    currency_code: "eur"
                                },
                                {
                                    amount: 15,
                                    currency_code: "usd"
                                }
                            ]
                        }
                    ],
                    sales_channels: [
                        {
                            id: defaultSalesChannel[0].id
                        }
                    ]
                }
            ]
        }
    });
    logger.info("Finished seeding product data.");
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9zY3JpcHRzL3NlZWQudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgY3JlYXRlQXBpS2V5c1dvcmtmbG93LFxuICBjcmVhdGVQcm9kdWN0Q2F0ZWdvcmllc1dvcmtmbG93LFxuICBjcmVhdGVQcm9kdWN0c1dvcmtmbG93LFxuICBjcmVhdGVSZWdpb25zV29ya2Zsb3csXG4gIGNyZWF0ZVNhbGVzQ2hhbm5lbHNXb3JrZmxvdyxcbiAgY3JlYXRlU2hpcHBpbmdPcHRpb25zV29ya2Zsb3csXG4gIGNyZWF0ZVNoaXBwaW5nUHJvZmlsZXNXb3JrZmxvdyxcbiAgY3JlYXRlU3RvY2tMb2NhdGlvbnNXb3JrZmxvdyxcbiAgY3JlYXRlVGF4UmVnaW9uc1dvcmtmbG93LFxuICBsaW5rU2FsZXNDaGFubmVsc1RvQXBpS2V5V29ya2Zsb3csXG4gIGxpbmtTYWxlc0NoYW5uZWxzVG9TdG9ja0xvY2F0aW9uV29ya2Zsb3csXG4gIHVwZGF0ZVN0b3Jlc1dvcmtmbG93LFxufSBmcm9tIFwiQG1lZHVzYWpzL2NvcmUtZmxvd3NcIjtcbmltcG9ydCB7IExvZ2dlciB9IGZyb20gXCJAbWVkdXNhanMvbWVkdXNhXCI7XG5pbXBvcnQgeyBSZW1vdGVMaW5rIH0gZnJvbSBcIkBtZWR1c2Fqcy9tb2R1bGVzLXNka1wiO1xuaW1wb3J0IHtcbiAgRXhlY0FyZ3MsXG4gIElGdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UsXG4gIElTYWxlc0NoYW5uZWxNb2R1bGVTZXJ2aWNlLFxuICBJU3RvcmVNb2R1bGVTZXJ2aWNlLFxufSBmcm9tIFwiQG1lZHVzYWpzL3R5cGVzXCI7XG5pbXBvcnQge1xuICBDb250YWluZXJSZWdpc3RyYXRpb25LZXlzLFxuICBNb2R1bGVzLFxuICBQcm9kdWN0U3RhdHVzLFxuICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lXG59IGZyb20gXCJAbWVkdXNhanMvdXRpbHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgYXN5bmMgZnVuY3Rpb24gc2VlZERlbW9EYXRhKHsgY29udGFpbmVyIH06IEV4ZWNBcmdzKSB7XG4gIGNvbnN0IGxvZ2dlcjogTG9nZ2VyID0gY29udGFpbmVyLnJlc29sdmUoQ29udGFpbmVyUmVnaXN0cmF0aW9uS2V5cy5MT0dHRVIpO1xuICBjb25zdCByZW1vdGVMaW5rOiBSZW1vdGVMaW5rID0gY29udGFpbmVyLnJlc29sdmUoXG4gICAgQ29udGFpbmVyUmVnaXN0cmF0aW9uS2V5cy5SRU1PVEVfTElOS1xuICApO1xuICBjb25zdCBmdWxmaWxsbWVudE1vZHVsZVNlcnZpY2U6IElGdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UgPSBjb250YWluZXIucmVzb2x2ZShcbiAgICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lLkZVTEZJTExNRU5UXG4gICk7XG4gIGNvbnN0IHNhbGVzQ2hhbm5lbE1vZHVsZVNlcnZpY2U6IElTYWxlc0NoYW5uZWxNb2R1bGVTZXJ2aWNlID1cbiAgICBjb250YWluZXIucmVzb2x2ZShNb2R1bGVSZWdpc3RyYXRpb25OYW1lLlNBTEVTX0NIQU5ORUwpO1xuICBjb25zdCBzdG9yZU1vZHVsZVNlcnZpY2U6IElTdG9yZU1vZHVsZVNlcnZpY2UgPSBjb250YWluZXIucmVzb2x2ZShcbiAgICBNb2R1bGVSZWdpc3RyYXRpb25OYW1lLlNUT1JFXG4gICk7XG5cbiAgY29uc3QgY291bnRyaWVzID0gW1wiZ2JcIiwgXCJkZVwiLCBcImRrXCIsIFwic2VcIiwgXCJmclwiLCBcImVzXCIsIFwiaXRcIl07XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHN0b3JlIGRhdGEuLi5cIik7XG4gIGNvbnN0IFtzdG9yZV0gPSBhd2FpdCBzdG9yZU1vZHVsZVNlcnZpY2UubGlzdFN0b3JlcygpO1xuICBsZXQgZGVmYXVsdFNhbGVzQ2hhbm5lbCA9IGF3YWl0IHNhbGVzQ2hhbm5lbE1vZHVsZVNlcnZpY2UubGlzdFNhbGVzQ2hhbm5lbHMoe1xuICAgIG5hbWU6IFwiRGVmYXVsdCBTYWxlcyBDaGFubmVsXCIsXG4gIH0pO1xuXG4gIGlmICghZGVmYXVsdFNhbGVzQ2hhbm5lbC5sZW5ndGgpIHtcbiAgICAvLyBjcmVhdGUgdGhlIGRlZmF1bHQgc2FsZXMgY2hhbm5lbFxuICAgIGNvbnN0IHsgcmVzdWx0OiBzYWxlc0NoYW5uZWxSZXN1bHQgfSA9IGF3YWl0IGNyZWF0ZVNhbGVzQ2hhbm5lbHNXb3JrZmxvdyhcbiAgICAgIGNvbnRhaW5lclxuICAgICkucnVuKHtcbiAgICAgIGlucHV0OiB7XG4gICAgICAgIHNhbGVzQ2hhbm5lbHNEYXRhOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJEZWZhdWx0IFNhbGVzIENoYW5uZWxcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBkZWZhdWx0U2FsZXNDaGFubmVsID0gc2FsZXNDaGFubmVsUmVzdWx0O1xuICB9XG5cbiAgYXdhaXQgdXBkYXRlU3RvcmVzV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBzZWxlY3RvcjogeyBpZDogc3RvcmUuaWQgfSxcbiAgICAgIHVwZGF0ZToge1xuICAgICAgICBzdXBwb3J0ZWRfY3VycmVuY2llczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICBpc19kZWZhdWx0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBkZWZhdWx0X3NhbGVzX2NoYW5uZWxfaWQ6IGRlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWQsXG4gICAgICB9LFxuICAgIH0sXG4gIH0pO1xuICBsb2dnZXIuaW5mbyhcIlNlZWRpbmcgcmVnaW9uIGRhdGEuLi5cIik7XG4gIGNvbnN0IHsgcmVzdWx0OiByZWdpb25SZXN1bHQgfSA9IGF3YWl0IGNyZWF0ZVJlZ2lvbnNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHJlZ2lvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiRXVyb3BlXCIsXG4gICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICBjb3VudHJpZXMsXG4gICAgICAgICAgcGF5bWVudF9wcm92aWRlcnM6IFtcInBwX3N5c3RlbV9kZWZhdWx0XCJdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgcmVnaW9uID0gcmVnaW9uUmVzdWx0WzBdO1xuICBsb2dnZXIuaW5mbyhcIkZpbmlzaGVkIHNlZWRpbmcgcmVnaW9ucy5cIik7XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHRheCByZWdpb25zLi4uXCIpO1xuICBhd2FpdCBjcmVhdGVUYXhSZWdpb25zV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiBjb3VudHJpZXMubWFwKChjb3VudHJ5X2NvZGUpID0+ICh7XG4gICAgICBjb3VudHJ5X2NvZGUsXG4gICAgfSkpLFxuICB9KTtcbiAgbG9nZ2VyLmluZm8oXCJGaW5pc2hlZCBzZWVkaW5nIHRheCByZWdpb25zLlwiKTtcblxuICBsb2dnZXIuaW5mbyhcIlNlZWRpbmcgc3RvY2sgbG9jYXRpb24gZGF0YS4uLlwiKTtcbiAgY29uc3QgeyByZXN1bHQ6IHN0b2NrTG9jYXRpb25SZXN1bHQgfSA9IGF3YWl0IGNyZWF0ZVN0b2NrTG9jYXRpb25zV29ya2Zsb3coXG4gICAgY29udGFpbmVyXG4gICkucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgbG9jYXRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIkV1cm9wZWFuIFdhcmVob3VzZVwiLFxuICAgICAgICAgIGFkZHJlc3M6IHtcbiAgICAgICAgICAgIGNpdHk6IFwiQ29wZW5oYWdlblwiLFxuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcIkRLXCIsXG4gICAgICAgICAgICBhZGRyZXNzXzE6IFwiXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHN0b2NrTG9jYXRpb24gPSBzdG9ja0xvY2F0aW9uUmVzdWx0WzBdO1xuXG4gIGF3YWl0IHJlbW90ZUxpbmsuY3JlYXRlKHtcbiAgICBbTW9kdWxlcy5TVE9DS19MT0NBVElPTl06IHtcbiAgICAgIHN0b2NrX2xvY2F0aW9uX2lkOiBzdG9ja0xvY2F0aW9uLmlkLFxuICAgIH0sXG4gICAgW01vZHVsZXMuRlVMRklMTE1FTlRdOiB7XG4gICAgICBmdWxmaWxsbWVudF9wcm92aWRlcl9pZDogXCJtYW51YWxfbWFudWFsXCIsXG4gICAgfSxcbiAgfSk7XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIGZ1bGZpbGxtZW50IGRhdGEuLi5cIik7XG4gIGNvbnN0IHsgcmVzdWx0OiBzaGlwcGluZ1Byb2ZpbGVSZXN1bHQgfSA9XG4gICAgYXdhaXQgY3JlYXRlU2hpcHBpbmdQcm9maWxlc1dvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICAgIGlucHV0OiB7XG4gICAgICAgIGRhdGE6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcIkRlZmF1bHRcIixcbiAgICAgICAgICAgIHR5cGU6IFwiZGVmYXVsdFwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgIH0pO1xuICBjb25zdCBzaGlwcGluZ1Byb2ZpbGUgPSBzaGlwcGluZ1Byb2ZpbGVSZXN1bHRbMF07XG5cbiAgY29uc3QgZnVsZmlsbG1lbnRTZXQgPSBhd2FpdCBmdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UuY3JlYXRlRnVsZmlsbG1lbnRTZXRzKHtcbiAgICBuYW1lOiBcIkV1cm9wZWFuIFdhcmVob3VzZSBkZWxpdmVyeVwiLFxuICAgIHR5cGU6IFwic2hpcHBpbmdcIixcbiAgICBzZXJ2aWNlX3pvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiRXVyb3BlXCIsXG4gICAgICAgIGdlb196b25lczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJnYlwiLFxuICAgICAgICAgICAgdHlwZTogXCJjb3VudHJ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb3VudHJ5X2NvZGU6IFwiZGVcIixcbiAgICAgICAgICAgIHR5cGU6IFwiY291bnRyeVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcImRrXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNvdW50cnlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJzZVwiLFxuICAgICAgICAgICAgdHlwZTogXCJjb3VudHJ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb3VudHJ5X2NvZGU6IFwiZnJcIixcbiAgICAgICAgICAgIHR5cGU6IFwiY291bnRyeVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgY291bnRyeV9jb2RlOiBcImVzXCIsXG4gICAgICAgICAgICB0eXBlOiBcImNvdW50cnlcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvdW50cnlfY29kZTogXCJpdFwiLFxuICAgICAgICAgICAgdHlwZTogXCJjb3VudHJ5XCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgXSxcbiAgfSk7XG5cbiAgYXdhaXQgcmVtb3RlTGluay5jcmVhdGUoe1xuICAgIFtNb2R1bGVzLlNUT0NLX0xPQ0FUSU9OXToge1xuICAgICAgc3RvY2tfbG9jYXRpb25faWQ6IHN0b2NrTG9jYXRpb24uaWQsXG4gICAgfSxcbiAgICBbTW9kdWxlcy5GVUxGSUxMTUVOVF06IHtcbiAgICAgIGZ1bGZpbGxtZW50X3NldF9pZDogZnVsZmlsbG1lbnRTZXQuaWQsXG4gICAgfSxcbiAgfSk7XG5cbiAgYXdhaXQgY3JlYXRlU2hpcHBpbmdPcHRpb25zV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IFwiU3RhbmRhcmQgU2hpcHBpbmdcIixcbiAgICAgICAgcHJpY2VfdHlwZTogXCJmbGF0XCIsXG4gICAgICAgIHByb3ZpZGVyX2lkOiBcIm1hbnVhbF9tYW51YWxcIixcbiAgICAgICAgc2VydmljZV96b25lX2lkOiBmdWxmaWxsbWVudFNldC5zZXJ2aWNlX3pvbmVzWzBdLmlkLFxuICAgICAgICBzaGlwcGluZ19wcm9maWxlX2lkOiBzaGlwcGluZ1Byb2ZpbGUuaWQsXG4gICAgICAgIHR5cGU6IHtcbiAgICAgICAgICBsYWJlbDogXCJTdGFuZGFyZFwiLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlNoaXAgaW4gMi0zIGRheXMuXCIsXG4gICAgICAgICAgY29kZTogXCJzdGFuZGFyZFwiLFxuICAgICAgICB9LFxuICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgcmVnaW9uX2lkOiByZWdpb24uaWQsXG4gICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXR0cmlidXRlOiBcImVuYWJsZWRfaW5fc3RvcmVcIixcbiAgICAgICAgICAgIHZhbHVlOiAnXCJ0cnVlXCInLFxuICAgICAgICAgICAgb3BlcmF0b3I6IFwiZXFcIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZTogXCJpc19yZXR1cm5cIixcbiAgICAgICAgICAgIHZhbHVlOiBcImZhbHNlXCIsXG4gICAgICAgICAgICBvcGVyYXRvcjogXCJlcVwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBuYW1lOiBcIkV4cHJlc3MgU2hpcHBpbmdcIixcbiAgICAgICAgcHJpY2VfdHlwZTogXCJmbGF0XCIsXG4gICAgICAgIHByb3ZpZGVyX2lkOiBcIm1hbnVhbF9tYW51YWxcIixcbiAgICAgICAgc2VydmljZV96b25lX2lkOiBmdWxmaWxsbWVudFNldC5zZXJ2aWNlX3pvbmVzWzBdLmlkLFxuICAgICAgICBzaGlwcGluZ19wcm9maWxlX2lkOiBzaGlwcGluZ1Byb2ZpbGUuaWQsXG4gICAgICAgIHR5cGU6IHtcbiAgICAgICAgICBsYWJlbDogXCJFeHByZXNzXCIsXG4gICAgICAgICAgZGVzY3JpcHRpb246IFwiU2hpcCBpbiAyNCBob3Vycy5cIixcbiAgICAgICAgICBjb2RlOiBcImV4cHJlc3NcIixcbiAgICAgICAgfSxcbiAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHJlZ2lvbl9pZDogcmVnaW9uLmlkLFxuICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBydWxlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGF0dHJpYnV0ZTogXCJlbmFibGVkX2luX3N0b3JlXCIsXG4gICAgICAgICAgICB2YWx1ZTogJ1widHJ1ZVwiJyxcbiAgICAgICAgICAgIG9wZXJhdG9yOiBcImVxXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBhdHRyaWJ1dGU6IFwiaXNfcmV0dXJuXCIsXG4gICAgICAgICAgICB2YWx1ZTogXCJmYWxzZVwiLFxuICAgICAgICAgICAgb3BlcmF0b3I6IFwiZXFcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICBdLFxuICB9KTtcbiAgbG9nZ2VyLmluZm8oXCJGaW5pc2hlZCBzZWVkaW5nIGZ1bGZpbGxtZW50IGRhdGEuXCIpO1xuXG4gIGF3YWl0IGxpbmtTYWxlc0NoYW5uZWxzVG9TdG9ja0xvY2F0aW9uV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBpZDogc3RvY2tMb2NhdGlvbi5pZCxcbiAgICAgIGFkZDogW2RlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWRdLFxuICAgIH0sXG4gIH0pO1xuICBsb2dnZXIuaW5mbyhcIkZpbmlzaGVkIHNlZWRpbmcgc3RvY2sgbG9jYXRpb24gZGF0YS5cIik7XG5cbiAgbG9nZ2VyLmluZm8oXCJTZWVkaW5nIHB1Ymxpc2hhYmxlIEFQSSBrZXkgZGF0YS4uLlwiKTtcbiAgY29uc3QgeyByZXN1bHQ6IHB1Ymxpc2hhYmxlQXBpS2V5UmVzdWx0IH0gPSBhd2FpdCBjcmVhdGVBcGlLZXlzV29ya2Zsb3coXG4gICAgY29udGFpbmVyXG4gICkucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgYXBpX2tleXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiBcIldlYnNob3BcIixcbiAgICAgICAgICB0eXBlOiBcInB1Ymxpc2hhYmxlXCIsXG4gICAgICAgICAgY3JlYXRlZF9ieTogXCJcIixcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IHB1Ymxpc2hhYmxlQXBpS2V5ID0gcHVibGlzaGFibGVBcGlLZXlSZXN1bHRbMF07XG5cbiAgYXdhaXQgbGlua1NhbGVzQ2hhbm5lbHNUb0FwaUtleVdvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgaWQ6IHB1Ymxpc2hhYmxlQXBpS2V5LmlkLFxuICAgICAgYWRkOiBbZGVmYXVsdFNhbGVzQ2hhbm5lbFswXS5pZF0sXG4gICAgfSxcbiAgfSk7XG4gIGxvZ2dlci5pbmZvKFwiRmluaXNoZWQgc2VlZGluZyBwdWJsaXNoYWJsZSBBUEkga2V5IGRhdGEuXCIpO1xuXG4gIGxvZ2dlci5pbmZvKFwiU2VlZGluZyBwcm9kdWN0IGRhdGEuLi5cIik7XG5cbiAgY29uc3QgeyByZXN1bHQ6IGNhdGVnb3J5UmVzdWx0IH0gPSBhd2FpdCBjcmVhdGVQcm9kdWN0Q2F0ZWdvcmllc1dvcmtmbG93KFxuICAgIGNvbnRhaW5lclxuICApLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHByb2R1Y3RfY2F0ZWdvcmllczogW1xuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJTaGlydHNcIixcbiAgICAgICAgICBpc19hY3RpdmU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBuYW1lOiBcIlN3ZWF0c2hpcnRzXCIsXG4gICAgICAgICAgaXNfYWN0aXZlOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgbmFtZTogXCJQYW50c1wiLFxuICAgICAgICAgIGlzX2FjdGl2ZTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIG5hbWU6IFwiTWVyY2hcIixcbiAgICAgICAgICBpc19hY3RpdmU6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xuXG4gIGF3YWl0IGNyZWF0ZVByb2R1Y3RzV29ya2Zsb3coY29udGFpbmVyKS5ydW4oe1xuICAgIGlucHV0OiB7XG4gICAgICBwcm9kdWN0czogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6IFwiTWVkdXNhIFQtU2hpcnRcIixcbiAgICAgICAgICBjYXRlZ29yeV9pZHM6IFtcbiAgICAgICAgICAgIGNhdGVnb3J5UmVzdWx0LmZpbmQoKGNhdCkgPT4gY2F0Lm5hbWUgPT09IFwiU2hpcnRzXCIpLmlkLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICBcIlJlaW1hZ2luZSB0aGUgZmVlbGluZyBvZiBhIGNsYXNzaWMgVC1zaGlydC4gV2l0aCBvdXIgY290dG9uIFQtc2hpcnRzLCBldmVyeWRheSBlc3NlbnRpYWxzIG5vIGxvbmdlciBoYXZlIHRvIGJlIG9yZGluYXJ5LlwiLFxuICAgICAgICAgIGhhbmRsZTogXCJ0LXNoaXJ0XCIsXG4gICAgICAgICAgd2VpZ2h0OiA0MDAsXG4gICAgICAgICAgc3RhdHVzOiBQcm9kdWN0U3RhdHVzLlBVQkxJU0hFRCxcbiAgICAgICAgICBpbWFnZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vdGVlLWJsYWNrLWZyb250LnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdXJsOiBcImh0dHBzOi8vbWVkdXNhLXB1YmxpYy1pbWFnZXMuczMuZXUtd2VzdC0xLmFtYXpvbmF3cy5jb20vdGVlLWJsYWNrLWJhY2sucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS90ZWUtd2hpdGUtZnJvbnQucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS90ZWUtd2hpdGUtYmFjay5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNpemVcIixcbiAgICAgICAgICAgICAgdmFsdWVzOiBbXCJTXCIsIFwiTVwiLCBcIkxcIiwgXCJYTFwiXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkNvbG9yXCIsXG4gICAgICAgICAgICAgIHZhbHVlczogW1wiQmxhY2tcIiwgXCJXaGl0ZVwiXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTIC8gQmxhY2tcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULVMtQkxBQ0tcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiU1wiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIkJsYWNrXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTIC8gV2hpdGVcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULVMtV0hJVEVcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiU1wiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIldoaXRlXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJNIC8gQmxhY2tcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULU0tQkxBQ0tcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTVwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIkJsYWNrXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJNIC8gV2hpdGVcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULU0tV0hJVEVcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTVwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIldoaXRlXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJMIC8gQmxhY2tcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULUwtQkxBQ0tcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTFwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIkJsYWNrXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJMIC8gV2hpdGVcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNISVJULUwtV0hJVEVcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTFwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIldoaXRlXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJYTCAvIEJsYWNrXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1YTC1CTEFDS1wiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJYTFwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIkJsYWNrXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJYTCAvIFdoaXRlXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTSElSVC1YTC1XSElURVwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJYTFwiLFxuICAgICAgICAgICAgICAgIENvbG9yOiBcIldoaXRlXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2FsZXNfY2hhbm5lbHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWQ6IGRlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xuICBhd2FpdCBjcmVhdGVQcm9kdWN0c1dvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgcHJvZHVjdHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiBcIk1lZHVzYSBTd2VhdHNoaXJ0XCIsXG4gICAgICAgICAgY2F0ZWdvcnlfaWRzOiBbXG4gICAgICAgICAgICBjYXRlZ29yeVJlc3VsdC5maW5kKChjYXQpID0+IGNhdC5uYW1lID09PSBcIlN3ZWF0c2hpcnRzXCIpLmlkLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICBcIlJlaW1hZ2luZSB0aGUgZmVlbGluZyBvZiBhIGNsYXNzaWMgc3dlYXRzaGlydC4gV2l0aCBvdXIgY290dG9uIHN3ZWF0c2hpcnQsIGV2ZXJ5ZGF5IGVzc2VudGlhbHMgbm8gbG9uZ2VyIGhhdmUgdG8gYmUgb3JkaW5hcnkuXCIsXG4gICAgICAgICAgaGFuZGxlOiBcInN3ZWF0c2hpcnRcIixcbiAgICAgICAgICB3ZWlnaHQ6IDQwMCxcbiAgICAgICAgICBzdGF0dXM6IFByb2R1Y3RTdGF0dXMuUFVCTElTSEVELFxuICAgICAgICAgIGltYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zd2VhdHNoaXJ0LXZpbnRhZ2UtZnJvbnQucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zd2VhdHNoaXJ0LXZpbnRhZ2UtYmFjay5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNpemVcIixcbiAgICAgICAgICAgICAgdmFsdWVzOiBbXCJTXCIsIFwiTVwiLCBcIkxcIiwgXCJYTFwiXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICB2YXJpYW50czogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTV0VBVFNISVJULVNcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiU1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTVwiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRTSElSVC1NXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIk1cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIkxcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNXRUFUU0hJUlQtTFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJMXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJYTFwiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRTSElSVC1YTFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJYTFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNhbGVzX2NoYW5uZWxzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBkZWZhdWx0U2FsZXNDaGFubmVsWzBdLmlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgYXdhaXQgY3JlYXRlUHJvZHVjdHNXb3JrZmxvdyhjb250YWluZXIpLnJ1bih7XG4gICAgaW5wdXQ6IHtcbiAgICAgIHByb2R1Y3RzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogXCJNZWR1c2EgU3dlYXRwYW50c1wiLFxuICAgICAgICAgIGNhdGVnb3J5X2lkczogW2NhdGVnb3J5UmVzdWx0LmZpbmQoKGNhdCkgPT4gY2F0Lm5hbWUgPT09IFwiUGFudHNcIikuaWRdLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgXCJSZWltYWdpbmUgdGhlIGZlZWxpbmcgb2YgY2xhc3NpYyBzd2VhdHBhbnRzLiBXaXRoIG91ciBjb3R0b24gc3dlYXRwYW50cywgZXZlcnlkYXkgZXNzZW50aWFscyBubyBsb25nZXIgaGF2ZSB0byBiZSBvcmRpbmFyeS5cIixcbiAgICAgICAgICBoYW5kbGU6IFwic3dlYXRwYW50c1wiLFxuICAgICAgICAgIHdlaWdodDogNDAwLFxuICAgICAgICAgIHN0YXR1czogUHJvZHVjdFN0YXR1cy5QVUJMSVNIRUQsXG4gICAgICAgICAgaW1hZ2VzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL21lZHVzYS1wdWJsaWMtaW1hZ2VzLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL3N3ZWF0cGFudHMtZ3JheS1mcm9udC5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL21lZHVzYS1wdWJsaWMtaW1hZ2VzLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL3N3ZWF0cGFudHMtZ3JheS1iYWNrLnBuZ1wiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU2l6ZVwiLFxuICAgICAgICAgICAgICB2YWx1ZXM6IFtcIlNcIiwgXCJNXCIsIFwiTFwiLCBcIlhMXCJdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHZhcmlhbnRzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlNcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNXRUFUUEFOVFMtU1wiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJTXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJNXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTV0VBVFBBTlRTLU1cIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTFwiLFxuICAgICAgICAgICAgICBza3U6IFwiU1dFQVRQQU5UUy1MXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIkxcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbWFuYWdlX2ludmVudG9yeTogZmFsc2UsXG4gICAgICAgICAgICAgIHByaWNlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTAsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcImV1clwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxNSxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwidXNkXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHRpdGxlOiBcIlhMXCIsXG4gICAgICAgICAgICAgIHNrdTogXCJTV0VBVFBBTlRTLVhMXCIsXG4gICAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBTaXplOiBcIlhMXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIG1hbmFnZV9pbnZlbnRvcnk6IGZhbHNlLFxuICAgICAgICAgICAgICBwcmljZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDEwLFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJldXJcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgIGFtb3VudDogMTUsXG4gICAgICAgICAgICAgICAgICBjdXJyZW5jeV9jb2RlOiBcInVzZFwiLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgc2FsZXNfY2hhbm5lbHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWQ6IGRlZmF1bHRTYWxlc0NoYW5uZWxbMF0uaWQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0sXG4gIH0pO1xuICBhd2FpdCBjcmVhdGVQcm9kdWN0c1dvcmtmbG93KGNvbnRhaW5lcikucnVuKHtcbiAgICBpbnB1dDoge1xuICAgICAgcHJvZHVjdHM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiBcIk1lZHVzYSBTaG9ydHNcIixcbiAgICAgICAgICBjYXRlZ29yeV9pZHM6IFtjYXRlZ29yeVJlc3VsdC5maW5kKChjYXQpID0+IGNhdC5uYW1lID09PSBcIk1lcmNoXCIpLmlkXSxcbiAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgIFwiUmVpbWFnaW5lIHRoZSBmZWVsaW5nIG9mIGNsYXNzaWMgc2hvcnRzLiBXaXRoIG91ciBjb3R0b24gc2hvcnRzLCBldmVyeWRheSBlc3NlbnRpYWxzIG5vIGxvbmdlciBoYXZlIHRvIGJlIG9yZGluYXJ5LlwiLFxuICAgICAgICAgIGhhbmRsZTogXCJzaG9ydHNcIixcbiAgICAgICAgICB3ZWlnaHQ6IDQwMCxcbiAgICAgICAgICBzdGF0dXM6IFByb2R1Y3RTdGF0dXMuUFVCTElTSEVELFxuICAgICAgICAgIGltYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmw6IFwiaHR0cHM6Ly9tZWR1c2EtcHVibGljLWltYWdlcy5zMy5ldS13ZXN0LTEuYW1hem9uYXdzLmNvbS9zaG9ydHMtdmludGFnZS1mcm9udC5wbmdcIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHVybDogXCJodHRwczovL21lZHVzYS1wdWJsaWMtaW1hZ2VzLnMzLmV1LXdlc3QtMS5hbWF6b25hd3MuY29tL3Nob3J0cy12aW50YWdlLWJhY2sucG5nXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB0aXRsZTogXCJTaXplXCIsXG4gICAgICAgICAgICAgIHZhbHVlczogW1wiU1wiLCBcIk1cIiwgXCJMXCIsIFwiWExcIl0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgICAgdmFyaWFudHM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiU1wiLFxuICAgICAgICAgICAgICBza3U6IFwiU0hPUlRTLVNcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiU1wiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTVwiLFxuICAgICAgICAgICAgICBza3U6IFwiU0hPUlRTLU1cIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiTFwiLFxuICAgICAgICAgICAgICBza3U6IFwiU0hPUlRTLUxcIixcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIFNpemU6IFwiTFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgdGl0bGU6IFwiWExcIixcbiAgICAgICAgICAgICAgc2t1OiBcIlNIT1JUUy1YTFwiLFxuICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgU2l6ZTogXCJYTFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBtYW5hZ2VfaW52ZW50b3J5OiBmYWxzZSxcbiAgICAgICAgICAgICAgcHJpY2VzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgYW1vdW50OiAxMCxcbiAgICAgICAgICAgICAgICAgIGN1cnJlbmN5X2NvZGU6IFwiZXVyXCIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBhbW91bnQ6IDE1LFxuICAgICAgICAgICAgICAgICAgY3VycmVuY3lfY29kZTogXCJ1c2RcIixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIHNhbGVzX2NoYW5uZWxzOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBkZWZhdWx0U2FsZXNDaGFubmVsWzBdLmlkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9LFxuICB9KTtcbiAgbG9nZ2VyLmluZm8oXCJGaW5pc2hlZCBzZWVkaW5nIHByb2R1Y3QgZGF0YS5cIik7XG59XG4iXSwibmFtZXMiOlsic2VlZERlbW9EYXRhIiwiY29udGFpbmVyIiwibG9nZ2VyIiwicmVzb2x2ZSIsIkNvbnRhaW5lclJlZ2lzdHJhdGlvbktleXMiLCJMT0dHRVIiLCJyZW1vdGVMaW5rIiwiUkVNT1RFX0xJTksiLCJmdWxmaWxsbWVudE1vZHVsZVNlcnZpY2UiLCJNb2R1bGVSZWdpc3RyYXRpb25OYW1lIiwiRlVMRklMTE1FTlQiLCJzYWxlc0NoYW5uZWxNb2R1bGVTZXJ2aWNlIiwiU0FMRVNfQ0hBTk5FTCIsInN0b3JlTW9kdWxlU2VydmljZSIsIlNUT1JFIiwiY291bnRyaWVzIiwiaW5mbyIsInN0b3JlIiwibGlzdFN0b3JlcyIsImRlZmF1bHRTYWxlc0NoYW5uZWwiLCJsaXN0U2FsZXNDaGFubmVscyIsIm5hbWUiLCJsZW5ndGgiLCJyZXN1bHQiLCJzYWxlc0NoYW5uZWxSZXN1bHQiLCJjcmVhdGVTYWxlc0NoYW5uZWxzV29ya2Zsb3ciLCJydW4iLCJpbnB1dCIsInNhbGVzQ2hhbm5lbHNEYXRhIiwidXBkYXRlU3RvcmVzV29ya2Zsb3ciLCJzZWxlY3RvciIsImlkIiwidXBkYXRlIiwic3VwcG9ydGVkX2N1cnJlbmNpZXMiLCJjdXJyZW5jeV9jb2RlIiwiaXNfZGVmYXVsdCIsImRlZmF1bHRfc2FsZXNfY2hhbm5lbF9pZCIsInJlZ2lvblJlc3VsdCIsImNyZWF0ZVJlZ2lvbnNXb3JrZmxvdyIsInJlZ2lvbnMiLCJwYXltZW50X3Byb3ZpZGVycyIsInJlZ2lvbiIsImNyZWF0ZVRheFJlZ2lvbnNXb3JrZmxvdyIsIm1hcCIsImNvdW50cnlfY29kZSIsInN0b2NrTG9jYXRpb25SZXN1bHQiLCJjcmVhdGVTdG9ja0xvY2F0aW9uc1dvcmtmbG93IiwibG9jYXRpb25zIiwiYWRkcmVzcyIsImNpdHkiLCJhZGRyZXNzXzEiLCJzdG9ja0xvY2F0aW9uIiwiY3JlYXRlIiwiTW9kdWxlcyIsIlNUT0NLX0xPQ0FUSU9OIiwic3RvY2tfbG9jYXRpb25faWQiLCJmdWxmaWxsbWVudF9wcm92aWRlcl9pZCIsInNoaXBwaW5nUHJvZmlsZVJlc3VsdCIsImNyZWF0ZVNoaXBwaW5nUHJvZmlsZXNXb3JrZmxvdyIsImRhdGEiLCJ0eXBlIiwic2hpcHBpbmdQcm9maWxlIiwiZnVsZmlsbG1lbnRTZXQiLCJjcmVhdGVGdWxmaWxsbWVudFNldHMiLCJzZXJ2aWNlX3pvbmVzIiwiZ2VvX3pvbmVzIiwiZnVsZmlsbG1lbnRfc2V0X2lkIiwiY3JlYXRlU2hpcHBpbmdPcHRpb25zV29ya2Zsb3ciLCJwcmljZV90eXBlIiwicHJvdmlkZXJfaWQiLCJzZXJ2aWNlX3pvbmVfaWQiLCJzaGlwcGluZ19wcm9maWxlX2lkIiwibGFiZWwiLCJkZXNjcmlwdGlvbiIsImNvZGUiLCJwcmljZXMiLCJhbW91bnQiLCJyZWdpb25faWQiLCJydWxlcyIsImF0dHJpYnV0ZSIsInZhbHVlIiwib3BlcmF0b3IiLCJsaW5rU2FsZXNDaGFubmVsc1RvU3RvY2tMb2NhdGlvbldvcmtmbG93IiwiYWRkIiwicHVibGlzaGFibGVBcGlLZXlSZXN1bHQiLCJjcmVhdGVBcGlLZXlzV29ya2Zsb3ciLCJhcGlfa2V5cyIsInRpdGxlIiwiY3JlYXRlZF9ieSIsInB1Ymxpc2hhYmxlQXBpS2V5IiwibGlua1NhbGVzQ2hhbm5lbHNUb0FwaUtleVdvcmtmbG93IiwiY2F0ZWdvcnlSZXN1bHQiLCJjcmVhdGVQcm9kdWN0Q2F0ZWdvcmllc1dvcmtmbG93IiwicHJvZHVjdF9jYXRlZ29yaWVzIiwiaXNfYWN0aXZlIiwiY3JlYXRlUHJvZHVjdHNXb3JrZmxvdyIsInByb2R1Y3RzIiwiY2F0ZWdvcnlfaWRzIiwiZmluZCIsImNhdCIsImhhbmRsZSIsIndlaWdodCIsInN0YXR1cyIsIlByb2R1Y3RTdGF0dXMiLCJQVUJMSVNIRUQiLCJpbWFnZXMiLCJ1cmwiLCJvcHRpb25zIiwidmFsdWVzIiwidmFyaWFudHMiLCJza3UiLCJTaXplIiwiQ29sb3IiLCJtYW5hZ2VfaW52ZW50b3J5Iiwic2FsZXNfY2hhbm5lbHMiXSwicmFuZ2VNYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OzsiLCJtYXBwaW5ncyI6Ijs7OzsrQkE2QkE7OztlQUE4QkE7OzsyQkFoQnZCO3VCQWNBO0FBRVEsZUFBZUEsYUFBYSxFQUFFQyxTQUFTLEVBQVk7SUFDaEUsTUFBTUMsU0FBaUJELFVBQVVFLE9BQU8sQ0FBQ0MsZ0NBQXlCLENBQUNDLE1BQU07SUFDekUsTUFBTUMsYUFBeUJMLFVBQVVFLE9BQU8sQ0FDOUNDLGdDQUF5QixDQUFDRyxXQUFXO0lBRXZDLE1BQU1DLDJCQUFzRFAsVUFBVUUsT0FBTyxDQUMzRU0sNkJBQXNCLENBQUNDLFdBQVc7SUFFcEMsTUFBTUMsNEJBQ0pWLFVBQVVFLE9BQU8sQ0FBQ00sNkJBQXNCLENBQUNHLGFBQWE7SUFDeEQsTUFBTUMscUJBQTBDWixVQUFVRSxPQUFPLENBQy9ETSw2QkFBc0IsQ0FBQ0ssS0FBSztJQUc5QixNQUFNQyxZQUFZO1FBQUM7UUFBTTtRQUFNO1FBQU07UUFBTTtRQUFNO1FBQU07S0FBSztJQUU1RGIsT0FBT2MsSUFBSSxDQUFDO0lBQ1osTUFBTSxDQUFDQyxNQUFNLEdBQUcsTUFBTUosbUJBQW1CSyxVQUFVO0lBQ25ELElBQUlDLHNCQUFzQixNQUFNUiwwQkFBMEJTLGlCQUFpQixDQUFDO1FBQzFFQyxNQUFNO0lBQ1I7SUFFQSxJQUFJLENBQUNGLG9CQUFvQkcsTUFBTSxFQUFFO1FBQy9CLG1DQUFtQztRQUNuQyxNQUFNLEVBQUVDLFFBQVFDLGtCQUFrQixFQUFFLEdBQUcsTUFBTUMsSUFBQUEsc0NBQTJCLEVBQ3RFeEIsV0FDQXlCLEdBQUcsQ0FBQztZQUNKQyxPQUFPO2dCQUNMQyxtQkFBbUI7b0JBQ2pCO3dCQUNFUCxNQUFNO29CQUNSO2lCQUNEO1lBQ0g7UUFDRjtRQUNBRixzQkFBc0JLO0lBQ3hCO0lBRUEsTUFBTUssSUFBQUEsK0JBQW9CLEVBQUM1QixXQUFXeUIsR0FBRyxDQUFDO1FBQ3hDQyxPQUFPO1lBQ0xHLFVBQVU7Z0JBQUVDLElBQUlkLE1BQU1jLEVBQUU7WUFBQztZQUN6QkMsUUFBUTtnQkFDTkMsc0JBQXNCO29CQUNwQjt3QkFDRUMsZUFBZTt3QkFDZkMsWUFBWTtvQkFDZDtvQkFDQTt3QkFDRUQsZUFBZTtvQkFDakI7aUJBQ0Q7Z0JBQ0RFLDBCQUEwQmpCLG1CQUFtQixDQUFDLEVBQUUsQ0FBQ1ksRUFBRTtZQUNyRDtRQUNGO0lBQ0Y7SUFDQTdCLE9BQU9jLElBQUksQ0FBQztJQUNaLE1BQU0sRUFBRU8sUUFBUWMsWUFBWSxFQUFFLEdBQUcsTUFBTUMsSUFBQUEsZ0NBQXFCLEVBQUNyQyxXQUFXeUIsR0FBRyxDQUFDO1FBQzFFQyxPQUFPO1lBQ0xZLFNBQVM7Z0JBQ1A7b0JBQ0VsQixNQUFNO29CQUNOYSxlQUFlO29CQUNmbkI7b0JBQ0F5QixtQkFBbUI7d0JBQUM7cUJBQW9CO2dCQUMxQzthQUNEO1FBQ0g7SUFDRjtJQUNBLE1BQU1DLFNBQVNKLFlBQVksQ0FBQyxFQUFFO0lBQzlCbkMsT0FBT2MsSUFBSSxDQUFDO0lBRVpkLE9BQU9jLElBQUksQ0FBQztJQUNaLE1BQU0wQixJQUFBQSxtQ0FBd0IsRUFBQ3pDLFdBQVd5QixHQUFHLENBQUM7UUFDNUNDLE9BQU9aLFVBQVU0QixHQUFHLENBQUMsQ0FBQ0MsZUFBa0IsQ0FBQTtnQkFDdENBO1lBQ0YsQ0FBQTtJQUNGO0lBQ0ExQyxPQUFPYyxJQUFJLENBQUM7SUFFWmQsT0FBT2MsSUFBSSxDQUFDO0lBQ1osTUFBTSxFQUFFTyxRQUFRc0IsbUJBQW1CLEVBQUUsR0FBRyxNQUFNQyxJQUFBQSx1Q0FBNEIsRUFDeEU3QyxXQUNBeUIsR0FBRyxDQUFDO1FBQ0pDLE9BQU87WUFDTG9CLFdBQVc7Z0JBQ1Q7b0JBQ0UxQixNQUFNO29CQUNOMkIsU0FBUzt3QkFDUEMsTUFBTTt3QkFDTkwsY0FBYzt3QkFDZE0sV0FBVztvQkFDYjtnQkFDRjthQUNEO1FBQ0g7SUFDRjtJQUNBLE1BQU1DLGdCQUFnQk4sbUJBQW1CLENBQUMsRUFBRTtJQUU1QyxNQUFNdkMsV0FBVzhDLE1BQU0sQ0FBQztRQUN0QixDQUFDQyxjQUFPLENBQUNDLGNBQWMsQ0FBQyxFQUFFO1lBQ3hCQyxtQkFBbUJKLGNBQWNwQixFQUFFO1FBQ3JDO1FBQ0EsQ0FBQ3NCLGNBQU8sQ0FBQzNDLFdBQVcsQ0FBQyxFQUFFO1lBQ3JCOEMseUJBQXlCO1FBQzNCO0lBQ0Y7SUFFQXRELE9BQU9jLElBQUksQ0FBQztJQUNaLE1BQU0sRUFBRU8sUUFBUWtDLHFCQUFxQixFQUFFLEdBQ3JDLE1BQU1DLElBQUFBLHlDQUE4QixFQUFDekQsV0FBV3lCLEdBQUcsQ0FBQztRQUNsREMsT0FBTztZQUNMZ0MsTUFBTTtnQkFDSjtvQkFDRXRDLE1BQU07b0JBQ051QyxNQUFNO2dCQUNSO2FBQ0Q7UUFDSDtJQUNGO0lBQ0YsTUFBTUMsa0JBQWtCSixxQkFBcUIsQ0FBQyxFQUFFO0lBRWhELE1BQU1LLGlCQUFpQixNQUFNdEQseUJBQXlCdUQscUJBQXFCLENBQUM7UUFDMUUxQyxNQUFNO1FBQ051QyxNQUFNO1FBQ05JLGVBQWU7WUFDYjtnQkFDRTNDLE1BQU07Z0JBQ040QyxXQUFXO29CQUNUO3dCQUNFckIsY0FBYzt3QkFDZGdCLE1BQU07b0JBQ1I7b0JBQ0E7d0JBQ0VoQixjQUFjO3dCQUNkZ0IsTUFBTTtvQkFDUjtvQkFDQTt3QkFDRWhCLGNBQWM7d0JBQ2RnQixNQUFNO29CQUNSO29CQUNBO3dCQUNFaEIsY0FBYzt3QkFDZGdCLE1BQU07b0JBQ1I7b0JBQ0E7d0JBQ0VoQixjQUFjO3dCQUNkZ0IsTUFBTTtvQkFDUjtvQkFDQTt3QkFDRWhCLGNBQWM7d0JBQ2RnQixNQUFNO29CQUNSO29CQUNBO3dCQUNFaEIsY0FBYzt3QkFDZGdCLE1BQU07b0JBQ1I7aUJBQ0Q7WUFDSDtTQUNEO0lBQ0g7SUFFQSxNQUFNdEQsV0FBVzhDLE1BQU0sQ0FBQztRQUN0QixDQUFDQyxjQUFPLENBQUNDLGNBQWMsQ0FBQyxFQUFFO1lBQ3hCQyxtQkFBbUJKLGNBQWNwQixFQUFFO1FBQ3JDO1FBQ0EsQ0FBQ3NCLGNBQU8sQ0FBQzNDLFdBQVcsQ0FBQyxFQUFFO1lBQ3JCd0Qsb0JBQW9CSixlQUFlL0IsRUFBRTtRQUN2QztJQUNGO0lBRUEsTUFBTW9DLElBQUFBLHdDQUE2QixFQUFDbEUsV0FBV3lCLEdBQUcsQ0FBQztRQUNqREMsT0FBTztZQUNMO2dCQUNFTixNQUFNO2dCQUNOK0MsWUFBWTtnQkFDWkMsYUFBYTtnQkFDYkMsaUJBQWlCUixlQUFlRSxhQUFhLENBQUMsRUFBRSxDQUFDakMsRUFBRTtnQkFDbkR3QyxxQkFBcUJWLGdCQUFnQjlCLEVBQUU7Z0JBQ3ZDNkIsTUFBTTtvQkFDSlksT0FBTztvQkFDUEMsYUFBYTtvQkFDYkMsTUFBTTtnQkFDUjtnQkFDQUMsUUFBUTtvQkFDTjt3QkFDRXpDLGVBQWU7d0JBQ2YwQyxRQUFRO29CQUNWO29CQUNBO3dCQUNFMUMsZUFBZTt3QkFDZjBDLFFBQVE7b0JBQ1Y7b0JBQ0E7d0JBQ0VDLFdBQVdwQyxPQUFPVixFQUFFO3dCQUNwQjZDLFFBQVE7b0JBQ1Y7aUJBQ0Q7Z0JBQ0RFLE9BQU87b0JBQ0w7d0JBQ0VDLFdBQVc7d0JBQ1hDLE9BQU87d0JBQ1BDLFVBQVU7b0JBQ1o7b0JBQ0E7d0JBQ0VGLFdBQVc7d0JBQ1hDLE9BQU87d0JBQ1BDLFVBQVU7b0JBQ1o7aUJBQ0Q7WUFDSDtZQUNBO2dCQUNFNUQsTUFBTTtnQkFDTitDLFlBQVk7Z0JBQ1pDLGFBQWE7Z0JBQ2JDLGlCQUFpQlIsZUFBZUUsYUFBYSxDQUFDLEVBQUUsQ0FBQ2pDLEVBQUU7Z0JBQ25Ed0MscUJBQXFCVixnQkFBZ0I5QixFQUFFO2dCQUN2QzZCLE1BQU07b0JBQ0pZLE9BQU87b0JBQ1BDLGFBQWE7b0JBQ2JDLE1BQU07Z0JBQ1I7Z0JBQ0FDLFFBQVE7b0JBQ047d0JBQ0V6QyxlQUFlO3dCQUNmMEMsUUFBUTtvQkFDVjtvQkFDQTt3QkFDRTFDLGVBQWU7d0JBQ2YwQyxRQUFRO29CQUNWO29CQUNBO3dCQUNFQyxXQUFXcEMsT0FBT1YsRUFBRTt3QkFDcEI2QyxRQUFRO29CQUNWO2lCQUNEO2dCQUNERSxPQUFPO29CQUNMO3dCQUNFQyxXQUFXO3dCQUNYQyxPQUFPO3dCQUNQQyxVQUFVO29CQUNaO29CQUNBO3dCQUNFRixXQUFXO3dCQUNYQyxPQUFPO3dCQUNQQyxVQUFVO29CQUNaO2lCQUNEO1lBQ0g7U0FDRDtJQUNIO0lBQ0EvRSxPQUFPYyxJQUFJLENBQUM7SUFFWixNQUFNa0UsSUFBQUEsbURBQXdDLEVBQUNqRixXQUFXeUIsR0FBRyxDQUFDO1FBQzVEQyxPQUFPO1lBQ0xJLElBQUlvQixjQUFjcEIsRUFBRTtZQUNwQm9ELEtBQUs7Z0JBQUNoRSxtQkFBbUIsQ0FBQyxFQUFFLENBQUNZLEVBQUU7YUFBQztRQUNsQztJQUNGO0lBQ0E3QixPQUFPYyxJQUFJLENBQUM7SUFFWmQsT0FBT2MsSUFBSSxDQUFDO0lBQ1osTUFBTSxFQUFFTyxRQUFRNkQsdUJBQXVCLEVBQUUsR0FBRyxNQUFNQyxJQUFBQSxnQ0FBcUIsRUFDckVwRixXQUNBeUIsR0FBRyxDQUFDO1FBQ0pDLE9BQU87WUFDTDJELFVBQVU7Z0JBQ1I7b0JBQ0VDLE9BQU87b0JBQ1AzQixNQUFNO29CQUNONEIsWUFBWTtnQkFDZDthQUNEO1FBQ0g7SUFDRjtJQUNBLE1BQU1DLG9CQUFvQkwsdUJBQXVCLENBQUMsRUFBRTtJQUVwRCxNQUFNTSxJQUFBQSw0Q0FBaUMsRUFBQ3pGLFdBQVd5QixHQUFHLENBQUM7UUFDckRDLE9BQU87WUFDTEksSUFBSTBELGtCQUFrQjFELEVBQUU7WUFDeEJvRCxLQUFLO2dCQUFDaEUsbUJBQW1CLENBQUMsRUFBRSxDQUFDWSxFQUFFO2FBQUM7UUFDbEM7SUFDRjtJQUNBN0IsT0FBT2MsSUFBSSxDQUFDO0lBRVpkLE9BQU9jLElBQUksQ0FBQztJQUVaLE1BQU0sRUFBRU8sUUFBUW9FLGNBQWMsRUFBRSxHQUFHLE1BQU1DLElBQUFBLDBDQUErQixFQUN0RTNGLFdBQ0F5QixHQUFHLENBQUM7UUFDSkMsT0FBTztZQUNMa0Usb0JBQW9CO2dCQUNsQjtvQkFDRXhFLE1BQU07b0JBQ055RSxXQUFXO2dCQUNiO2dCQUNBO29CQUNFekUsTUFBTTtvQkFDTnlFLFdBQVc7Z0JBQ2I7Z0JBQ0E7b0JBQ0V6RSxNQUFNO29CQUNOeUUsV0FBVztnQkFDYjtnQkFDQTtvQkFDRXpFLE1BQU07b0JBQ055RSxXQUFXO2dCQUNiO2FBQ0Q7UUFDSDtJQUNGO0lBRUEsTUFBTUMsSUFBQUEsaUNBQXNCLEVBQUM5RixXQUFXeUIsR0FBRyxDQUFDO1FBQzFDQyxPQUFPO1lBQ0xxRSxVQUFVO2dCQUNSO29CQUNFVCxPQUFPO29CQUNQVSxjQUFjO3dCQUNaTixlQUFlTyxJQUFJLENBQUMsQ0FBQ0MsTUFBUUEsSUFBSTlFLElBQUksS0FBSyxVQUFVVSxFQUFFO3FCQUN2RDtvQkFDRDBDLGFBQ0U7b0JBQ0YyQixRQUFRO29CQUNSQyxRQUFRO29CQUNSQyxRQUFRQyxvQkFBYSxDQUFDQyxTQUFTO29CQUMvQkMsUUFBUTt3QkFDTjs0QkFDRUMsS0FBSzt3QkFDUDt3QkFDQTs0QkFDRUEsS0FBSzt3QkFDUDt3QkFDQTs0QkFDRUEsS0FBSzt3QkFDUDt3QkFDQTs0QkFDRUEsS0FBSzt3QkFDUDtxQkFDRDtvQkFDREMsU0FBUzt3QkFDUDs0QkFDRXBCLE9BQU87NEJBQ1BxQixRQUFRO2dDQUFDO2dDQUFLO2dDQUFLO2dDQUFLOzZCQUFLO3dCQUMvQjt3QkFDQTs0QkFDRXJCLE9BQU87NEJBQ1BxQixRQUFRO2dDQUFDO2dDQUFTOzZCQUFRO3dCQUM1QjtxQkFDRDtvQkFDREMsVUFBVTt3QkFDUjs0QkFDRXRCLE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNO2dDQUNOQyxPQUFPOzRCQUNUOzRCQUNBQyxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07Z0NBQ05DLE9BQU87NEJBQ1Q7NEJBQ0FDLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7d0JBQ0E7NEJBQ0VxRCxPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTtnQ0FDTkMsT0FBTzs0QkFDVDs0QkFDQUMsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDt3QkFDQTs0QkFDRXFELE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNO2dDQUNOQyxPQUFPOzRCQUNUOzRCQUNBQyxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07Z0NBQ05DLE9BQU87NEJBQ1Q7NEJBQ0FDLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7d0JBQ0E7NEJBQ0VxRCxPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTtnQ0FDTkMsT0FBTzs0QkFDVDs0QkFDQUMsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDt3QkFDQTs0QkFDRXFELE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNO2dDQUNOQyxPQUFPOzRCQUNUOzRCQUNBQyxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07Z0NBQ05DLE9BQU87NEJBQ1Q7NEJBQ0FDLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7cUJBQ0Q7b0JBQ0RnRixnQkFBZ0I7d0JBQ2Q7NEJBQ0VuRixJQUFJWixtQkFBbUIsQ0FBQyxFQUFFLENBQUNZLEVBQUU7d0JBQy9CO3FCQUNEO2dCQUNIO2FBQ0Q7UUFDSDtJQUNGO0lBQ0EsTUFBTWdFLElBQUFBLGlDQUFzQixFQUFDOUYsV0FBV3lCLEdBQUcsQ0FBQztRQUMxQ0MsT0FBTztZQUNMcUUsVUFBVTtnQkFDUjtvQkFDRVQsT0FBTztvQkFDUFUsY0FBYzt3QkFDWk4sZUFBZU8sSUFBSSxDQUFDLENBQUNDLE1BQVFBLElBQUk5RSxJQUFJLEtBQUssZUFBZVUsRUFBRTtxQkFDNUQ7b0JBQ0QwQyxhQUNFO29CQUNGMkIsUUFBUTtvQkFDUkMsUUFBUTtvQkFDUkMsUUFBUUMsb0JBQWEsQ0FBQ0MsU0FBUztvQkFDL0JDLFFBQVE7d0JBQ047NEJBQ0VDLEtBQUs7d0JBQ1A7d0JBQ0E7NEJBQ0VBLEtBQUs7d0JBQ1A7cUJBQ0Q7b0JBQ0RDLFNBQVM7d0JBQ1A7NEJBQ0VwQixPQUFPOzRCQUNQcUIsUUFBUTtnQ0FBQztnQ0FBSztnQ0FBSztnQ0FBSzs2QkFBSzt3QkFDL0I7cUJBQ0Q7b0JBQ0RDLFVBQVU7d0JBQ1I7NEJBQ0V0QixPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTs0QkFDUjs0QkFDQUUsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDt3QkFDQTs0QkFDRXFELE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNOzRCQUNSOzRCQUNBRSxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07NEJBQ1I7NEJBQ0FFLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7d0JBQ0E7NEJBQ0VxRCxPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTs0QkFDUjs0QkFDQUUsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDtxQkFDRDtvQkFDRGdGLGdCQUFnQjt3QkFDZDs0QkFDRW5GLElBQUlaLG1CQUFtQixDQUFDLEVBQUUsQ0FBQ1ksRUFBRTt3QkFDL0I7cUJBQ0Q7Z0JBQ0g7YUFDRDtRQUNIO0lBQ0Y7SUFDQSxNQUFNZ0UsSUFBQUEsaUNBQXNCLEVBQUM5RixXQUFXeUIsR0FBRyxDQUFDO1FBQzFDQyxPQUFPO1lBQ0xxRSxVQUFVO2dCQUNSO29CQUNFVCxPQUFPO29CQUNQVSxjQUFjO3dCQUFDTixlQUFlTyxJQUFJLENBQUMsQ0FBQ0MsTUFBUUEsSUFBSTlFLElBQUksS0FBSyxTQUFTVSxFQUFFO3FCQUFDO29CQUNyRTBDLGFBQ0U7b0JBQ0YyQixRQUFRO29CQUNSQyxRQUFRO29CQUNSQyxRQUFRQyxvQkFBYSxDQUFDQyxTQUFTO29CQUMvQkMsUUFBUTt3QkFDTjs0QkFDRUMsS0FBSzt3QkFDUDt3QkFDQTs0QkFDRUEsS0FBSzt3QkFDUDtxQkFDRDtvQkFDREMsU0FBUzt3QkFDUDs0QkFDRXBCLE9BQU87NEJBQ1BxQixRQUFRO2dDQUFDO2dDQUFLO2dDQUFLO2dDQUFLOzZCQUFLO3dCQUMvQjtxQkFDRDtvQkFDREMsVUFBVTt3QkFDUjs0QkFDRXRCLE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNOzRCQUNSOzRCQUNBRSxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07NEJBQ1I7NEJBQ0FFLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7d0JBQ0E7NEJBQ0VxRCxPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTs0QkFDUjs0QkFDQUUsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDt3QkFDQTs0QkFDRXFELE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNOzRCQUNSOzRCQUNBRSxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3FCQUNEO29CQUNEZ0YsZ0JBQWdCO3dCQUNkOzRCQUNFbkYsSUFBSVosbUJBQW1CLENBQUMsRUFBRSxDQUFDWSxFQUFFO3dCQUMvQjtxQkFDRDtnQkFDSDthQUNEO1FBQ0g7SUFDRjtJQUNBLE1BQU1nRSxJQUFBQSxpQ0FBc0IsRUFBQzlGLFdBQVd5QixHQUFHLENBQUM7UUFDMUNDLE9BQU87WUFDTHFFLFVBQVU7Z0JBQ1I7b0JBQ0VULE9BQU87b0JBQ1BVLGNBQWM7d0JBQUNOLGVBQWVPLElBQUksQ0FBQyxDQUFDQyxNQUFRQSxJQUFJOUUsSUFBSSxLQUFLLFNBQVNVLEVBQUU7cUJBQUM7b0JBQ3JFMEMsYUFDRTtvQkFDRjJCLFFBQVE7b0JBQ1JDLFFBQVE7b0JBQ1JDLFFBQVFDLG9CQUFhLENBQUNDLFNBQVM7b0JBQy9CQyxRQUFRO3dCQUNOOzRCQUNFQyxLQUFLO3dCQUNQO3dCQUNBOzRCQUNFQSxLQUFLO3dCQUNQO3FCQUNEO29CQUNEQyxTQUFTO3dCQUNQOzRCQUNFcEIsT0FBTzs0QkFDUHFCLFFBQVE7Z0NBQUM7Z0NBQUs7Z0NBQUs7Z0NBQUs7NkJBQUs7d0JBQy9CO3FCQUNEO29CQUNEQyxVQUFVO3dCQUNSOzRCQUNFdEIsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07NEJBQ1I7NEJBQ0FFLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7d0JBQ0E7NEJBQ0VxRCxPQUFPOzRCQUNQdUIsS0FBSzs0QkFDTEgsU0FBUztnQ0FDUEksTUFBTTs0QkFDUjs0QkFDQUUsa0JBQWtCOzRCQUNsQnRDLFFBQVE7Z0NBQ047b0NBQ0VDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjtnQ0FDQTtvQ0FDRTBDLFFBQVE7b0NBQ1IxQyxlQUFlO2dDQUNqQjs2QkFDRDt3QkFDSDt3QkFDQTs0QkFDRXFELE9BQU87NEJBQ1B1QixLQUFLOzRCQUNMSCxTQUFTO2dDQUNQSSxNQUFNOzRCQUNSOzRCQUNBRSxrQkFBa0I7NEJBQ2xCdEMsUUFBUTtnQ0FDTjtvQ0FDRUMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCO2dDQUNBO29DQUNFMEMsUUFBUTtvQ0FDUjFDLGVBQWU7Z0NBQ2pCOzZCQUNEO3dCQUNIO3dCQUNBOzRCQUNFcUQsT0FBTzs0QkFDUHVCLEtBQUs7NEJBQ0xILFNBQVM7Z0NBQ1BJLE1BQU07NEJBQ1I7NEJBQ0FFLGtCQUFrQjs0QkFDbEJ0QyxRQUFRO2dDQUNOO29DQUNFQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7Z0NBQ0E7b0NBQ0UwQyxRQUFRO29DQUNSMUMsZUFBZTtnQ0FDakI7NkJBQ0Q7d0JBQ0g7cUJBQ0Q7b0JBQ0RnRixnQkFBZ0I7d0JBQ2Q7NEJBQ0VuRixJQUFJWixtQkFBbUIsQ0FBQyxFQUFFLENBQUNZLEVBQUU7d0JBQy9CO3FCQUNEO2dCQUNIO2FBQ0Q7UUFDSDtJQUNGO0lBQ0E3QixPQUFPYyxJQUFJLENBQUM7QUFDZCJ9