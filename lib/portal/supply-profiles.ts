import type { SupplyProfile } from "./supply-model";

export const profiles: Record<string, SupplyProfile> = {
  "wholesaler": {
    "primary": "Product Offers",
    "nextTab": "Purchase Orders",
    "singular": "product offer",
    "receipt": "Product offer received for review",
    "pending": "Orders and shipment responses open after an authorized purchase order is issued.",
    "fields": [
      {
        "key": "external_id",
        "label": "Supplier product or variant ID",
        "type": "text",
        "required": true,
        "maxLength": 160
      },
      {
        "key": "category",
        "label": "Product category",
        "type": "choice",
        "required": true,
        "choices": {
          "ART_PRINT": "Poster or art print",
          "APPAREL": "Apparel"
        }
      },
      {
        "key": "variant",
        "label": "Variant, size or material",
        "type": "text",
        "required": true,
        "maxLength": 160
      },
      {
        "key": "provenance",
        "label": "Source and authenticity evidence references",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "quantity",
        "label": "Offered quantity",
        "type": "integer",
        "required": true
      },
      {
        "key": "moq",
        "label": "Minimum order quantity",
        "type": "integer",
        "required": true
      },
      {
        "key": "price_centavos",
        "label": "Unit price (PHP)",
        "type": "money",
        "required": true
      },
      {
        "key": "valid_until",
        "label": "Quote end day, exclusive (Manila)",
        "type": "date",
        "required": true
      },
      {
        "key": "delivery_terms",
        "label": "Lead time, destination, ownership, risk and shipping terms",
        "type": "long",
        "required": true,
        "maxLength": 2000
      }
    ],
    "invited": false
  },
  "manufacturer": {
    "primary": "Proposals",
    "nextTab": "Projects",
    "singular": "manufacturing proposal",
    "receipt": "Manufacturing proposal received for review",
    "pending": "Samples, milestones and batch delivery require the applicable signed contract and notice to proceed.",
    "fields": [
      {
        "key": "quantity",
        "label": "Proposed batch quantity",
        "type": "integer",
        "required": true
      },
      {
        "key": "price_centavos",
        "label": "Full itemized bid total (PHP)",
        "type": "money",
        "required": true
      },
      {
        "key": "costs",
        "label": "Itemized materials, tooling, royalties and other costs",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "schedule",
        "label": "Sample and batch delivery schedule",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "sample",
        "label": "Sample and quality acceptance plan",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "compliance",
        "label": "Product safety, packaging and inspection plan",
        "type": "long",
        "required": true,
        "maxLength": 2000
      },
      {
        "key": "contributions",
        "label": "Subcontract and artwork contributions and exclusions",
        "type": "long",
        "required": true,
        "maxLength": 2000
      }
    ],
    "invited": true
  }
};
