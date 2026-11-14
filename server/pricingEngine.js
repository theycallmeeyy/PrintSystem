/**
 * Centralized Pricing Engine & Configuration
 * Currency: Philippine Peso (₱)
 */

export const defaultPricing = {
  currency: 'PHP',
  currencySymbol: '₱',
  taxRatePercent: 0, // e.g. 12% if enabled, 0% by default
  setupFee: 0,
  rushFeePercent: 25, // +25% of subtotal when rush is requested
  deliveryFee: 80, // Flat delivery rate in PHP

  // Base rates per impression/unit for job types
  jobTypes: [
    {
      id: 'document',
      name: 'Document Printing',
      description: 'Standard black & white or color document prints',
      baseRatePerPage: 1.50,
      isPerSheetProduct: false // uses multi-page document sheet calculation
    },
    {
      id: 'photocopy',
      name: 'Photocopying',
      description: 'Fast high-volume document duplication',
      baseRatePerPage: 1.00,
      isPerSheetProduct: false
    },
    {
      id: 'photo',
      name: 'Photo Printing',
      description: 'High-resolution photo prints with archival inks',
      baseRatePerPage: 15.00,
      isPerSheetProduct: true // uses quantity directly
    },
    {
      id: 'flyers',
      name: 'Flyers & Leaflets',
      description: 'Single-sheet marketing flyers and handouts',
      baseRatePerPage: 3.50,
      isPerSheetProduct: true
    },
    {
      id: 'posters',
      name: 'Posters & Banners',
      description: 'Large format vibrant wall prints and promotional posters',
      baseRatePerPage: 35.00,
      isPerSheetProduct: true
    },
    {
      id: 'booklets',
      name: 'Brochures & Booklets',
      description: 'Folded multi-page brochures and stapled booklets',
      baseRatePerPage: 4.50,
      isPerSheetProduct: false
    },
    {
      id: 'custom',
      name: 'Custom Print Job',
      description: 'Special dimensions, bespoke print requests, or custom stock',
      baseRatePerPage: 5.00,
      isPerSheetProduct: true
    }
  ],

  // Paper Sizes & dimensional multipliers/surcharges
  paperSizes: [
    { id: 'A4', name: 'A4 (8.27" x 11.69" / 210 x 297mm)', surcharge: 0.00, multiplier: 1.0, documentRates: { bw: 7.00, color: 12.00 } },
    { id: 'Letter', name: 'Short / Letter (8.5" x 11" / 216 x 279mm)', surcharge: 0.00, multiplier: 1.0, documentRates: { bw: 5.00, color: 10.00 } },
    { id: 'Legal', name: 'Long / Legal (8.5" x 14" / 216 x 356mm)', surcharge: 0.50, multiplier: 1.1, documentRates: { bw: 9.00, color: 15.00 } },
    { id: 'A5', name: 'A5 (5.83" x 8.27" / 148 x 210mm)', surcharge: 0.00, multiplier: 0.8 },
    { id: 'A3', name: 'A3 (11.69" x 16.54" / 297 x 420mm)', surcharge: 6.00, multiplier: 2.0 },
    { id: 'Custom', name: 'Custom Dimensions', surcharge: 8.00, multiplier: 1.25 }
  ],

  // Paper Types and Materials (rate per physical sheet)
  paperMaterials: [
    { id: 'bond-70', name: 'Standard Bond Paper (70 gsm)', pricePerSheet: 0.50, description: 'Economical everyday paper' },
    { id: 'bond-80', name: 'Premium Bright Bond Paper (80 gsm)', pricePerSheet: 1.00, description: 'Crisp, smooth high-opacity bond' },
    { id: 'glossy-120', name: 'Glossy Paper (120 gsm)', pricePerSheet: 3.50, description: 'Vibrant sheen for flyers & presentations' },
    { id: 'photo-200', name: 'High-Gloss Photo Paper (200 gsm)', pricePerSheet: 8.00, description: 'Professional true-to-life photo finish' },
    { id: 'cardstock-220', name: 'Heavy Cardstock (220 gsm)', pricePerSheet: 5.00, description: 'Sturdy paper for covers & certificates' },
    { id: 'cardstock-300', name: 'Ultra-Heavy Cardstock (300 gsm)', pricePerSheet: 8.50, description: 'Extra rigid board for cards & menus' },
    { id: 'specialty-textured', name: 'Specialty Textured Paper (Linen/Parchment)', pricePerSheet: 12.00, description: 'Luxury tactile surface for invites' },
    { id: 'sticker-vinyl', name: 'Adhesive Sticker / Vinyl Paper', pricePerSheet: 15.00, description: 'Peel-and-stick waterproof finish' }
  ],

  // Color Mode pricing surcharges
  colorModes: [
    { id: 'bw', name: 'Black & White (Monochrome)', surchargePerPage: 0.00 },
    { id: 'color', name: 'Full Color Printing', surchargePerPage: 3.50 }
  ],

  // Print Sides configuration
  printSides: [
    { id: 'single', name: 'Single-sided (1 Side)', sidesPerSheet: 1, discountFactor: 1.0 },
    { id: 'double', name: 'Double-sided (Duplex, 2 Sides)', sidesPerSheet: 2, discountFactor: 0.90 } // 10% discount on double-sided print impressions
  ],

  // Optional Finishing Services
  finishingServices: [
    {
      id: 'lamination-gloss',
      name: 'Thermal Lamination (Gloss)',
      price: 15.00,
      pricingType: 'per-sheet', // per physical sheet
      description: 'Waterproof protective shiny film'
    },
    {
      id: 'lamination-matte',
      name: 'Thermal Lamination (Matte)',
      price: 18.00,
      pricingType: 'per-sheet',
      description: 'Sophisticated non-reflective finish'
    },
    {
      id: 'binding-comb',
      name: 'Plastic Comb Binding',
      price: 35.00,
      pricingType: 'per-copy', // per completed copy
      description: 'Standard flexible comb with clear cover & backboard'
    },
    {
      id: 'binding-wire',
      name: 'Wire-O Spiral Binding',
      price: 55.00,
      pricingType: 'per-copy',
      description: 'Durable 360-degree lay-flat metallic spiral'
    },
    {
      id: 'binding-hardbound',
      name: 'Hardbound Book Binding',
      price: 180.00,
      pricingType: 'per-copy',
      description: 'Gold-stamped rigid hard cover for theses & reports'
    },
    {
      id: 'stapling-corner',
      name: 'Corner Stapling',
      price: 2.00,
      pricingType: 'per-copy',
      description: 'Single heavy-duty corner staple'
    },
    {
      id: 'stapling-booklet',
      name: 'Saddle-Stitch Stapling (Booklet)',
      price: 5.00,
      pricingType: 'per-copy',
      description: 'Center folded spine stapling'
    },
    {
      id: 'cutting-trim',
      name: 'Precision Cutting / Trimming',
      price: 15.00,
      pricingType: 'fixed',
      description: 'Guillotine clean cut to custom dimensions'
    },
    {
      id: 'layout-assistance',
      name: 'Formatting / Layout Assistance',
      price: 50.00,
      pricingType: 'fixed',
      description: 'Staff inspection and page margins/column alignment aid'
    }
  ],

  // Active Promo Discount Codes
  discountCodes: [
    { code: 'PRINT10', type: 'percent', value: 10, description: '10% Off Orders' },
    { code: 'WELCOME50', type: 'fixed', value: 50, description: '50₱ Off First Order' },
    { code: 'BULK15', type: 'percent', value: 15, description: '15% Off Volume Orders' }
  ]
};

/**
 * Calculates complete pricing breakdown for an order
 * Formula:
 * Physical Sheets = Ceiling(Pages per Copy ÷ Sides per Sheet) × Number of Copies
 */
export function calculatePricing(orderData, pricing = defaultPricing) {
  const {
    jobTypeId = 'document',
    paperSizeId = 'A4',
    paperMaterialId = 'bond-70',
    colorModeId = 'bw',
    printSideId = 'single',
    pagesPerCopy = 1,
    copies = 1,
    productQuantity = 1,
    selectedFinishing = [], // array of finishing service IDs
    isRush = false,
    isDelivery = false,
    discountCode = '',
    customDiscountAmount = 0
  } = orderData;

  const jobType = pricing.jobTypes.find(j => j.id === jobTypeId) || pricing.jobTypes[0];
  const paperSize = pricing.paperSizes.find(s => s.id === paperSizeId) || pricing.paperSizes[0];
  const material = pricing.paperMaterials.find(m => m.id === paperMaterialId) || pricing.paperMaterials[0];
  const colorMode = pricing.colorModes.find(c => c.id === colorModeId) || pricing.colorModes[0];
  const printSide = pricing.printSides.find(s => s.id === printSideId) || pricing.printSides[0];

  const sidesPerSheet = printSide.sidesPerSheet || 1;
  const safePages = Math.max(1, parseInt(pagesPerCopy, 10) || 1);
  const safeCopies = Math.max(1, parseInt(copies, 10) || 1);
  const safeProductQty = Math.max(1, parseInt(productQuantity, 10) || 1);

  let physicalSheets = 0;
  let totalBillableImpressions = 0;
  let billableItemsCount = 0;

  if (jobType.isPerSheetProduct) {
    // For single-unit products like flyers, posters, photo prints
    billableItemsCount = safeProductQty;
    physicalSheets = safeProductQty;
    totalBillableImpressions = safeProductQty;
  } else {
    // For document printing & photocopying
    // Physical Sheets = Ceiling(Pages per Copy ÷ Sides per Sheet) × Number of Copies
    const sheetsPerCopy = Math.ceil(safePages / sidesPerSheet);
    physicalSheets = sheetsPerCopy * safeCopies;
    totalBillableImpressions = safePages * safeCopies;
    billableItemsCount = totalBillableImpressions;
  }

  // 1. Base Printing Cost
  // Base job rate + color surcharge + paper size multiplier/surcharge
  const baseRate = (jobType.baseRatePerPage || 0);
  const colorSurcharge = (colorMode.surchargePerPage || 0);
  const sizeMultiplier = (paperSize.multiplier || 1.0);
  const sizeSurcharge = (paperSize.surcharge || 0.0);

  const configuredDocumentRate = paperSize.documentRates?.[colorMode.id];
  const hasConfiguredDocumentRate = jobType.id === 'document' &&
    typeof configuredDocumentRate === 'number' &&
    Number.isFinite(configuredDocumentRate);

  // Configured document rates replace the generic rate for the selected paper size and color.
  const unitPrintRate = hasConfiguredDocumentRate
    ? configuredDocumentRate * (printSide.discountFactor || 1.0)
    : ((baseRate + colorSurcharge) * sizeMultiplier * (printSide.discountFactor || 1.0)) + sizeSurcharge;
  const printingCost = Number((unitPrintRate * billableItemsCount).toFixed(2));

  // 2. Paper & Material Cost (charged per physical sheet)
  const unitMaterialRate = material.pricePerSheet || 0;
  const materialCost = Number((unitMaterialRate * physicalSheets).toFixed(2));

  // 3. Additional Finishing Services
  const finishingBreakdown = [];
  let finishingCost = 0;

  if (Array.isArray(selectedFinishing)) {
    selectedFinishing.forEach(finishId => {
      const service = pricing.finishingServices.find(f => f.id === finishId);
      if (service) {
        let charge = 0;
        let quantityUsed = 1;
        let unitDesc = 'fixed';

        if (service.pricingType === 'per-sheet') {
          quantityUsed = physicalSheets;
          charge = service.price * physicalSheets;
          unitDesc = `${physicalSheets} sheets × ${service.price.toFixed(2)}₱`;
        } else if (service.pricingType === 'per-copy') {
          const count = jobType.isPerSheetProduct ? 1 : safeCopies;
          quantityUsed = count;
          charge = service.price * count;
          unitDesc = `${count} copies × ${service.price.toFixed(2)}₱`;
        } else {
          // fixed
          quantityUsed = 1;
          charge = service.price;
          unitDesc = `Fixed fee`;
        }

        charge = Number(charge.toFixed(2));
        finishingCost += charge;

        finishingBreakdown.push({
          id: service.id,
          name: service.name,
          pricingType: service.pricingType,
          unitPrice: service.price,
          quantity: quantityUsed,
          unitDesc,
          total: charge
        });
      }
    });
  }
  finishingCost = Number(finishingCost.toFixed(2));

  // 4. Other Fees: Setup, Rush, Delivery
  const setupFee = Number((pricing.setupFee || 0).toFixed(2));

  // Subtotal before rush, delivery, discounts, tax
  const coreSubtotal = printingCost + materialCost + finishingCost + setupFee;

  let rushFee = 0;
  if (isRush) {
    const rushPct = pricing.rushFeePercent || 25;
    rushFee = Number((coreSubtotal * (rushPct / 100)).toFixed(2));
  }

  let deliveryFee = 0;
  if (isDelivery) {
    deliveryFee = Number((pricing.deliveryFee || 0).toFixed(2));
  }

  const subtotal = Number((coreSubtotal + rushFee + deliveryFee).toFixed(2));

  // 5. Discounts Calculation
  let discountAmount = 0;
  let appliedDiscountDesc = '';

  if (discountCode) {
    const codeMatch = (pricing.discountCodes || []).find(
      d => d.code.toUpperCase() === discountCode.trim().toUpperCase()
    );
    if (codeMatch) {
      if (codeMatch.type === 'percent') {
        discountAmount = Number(((subtotal * codeMatch.value) / 100).toFixed(2));
        appliedDiscountDesc = `${codeMatch.code} (${codeMatch.value}% off)`;
      } else {
        discountAmount = Number(codeMatch.value.toFixed(2));
        appliedDiscountDesc = `${codeMatch.code} (${codeMatch.value.toFixed(2)}₱ off)`;
      }
    }
  }

  if (customDiscountAmount && Number(customDiscountAmount) > 0) {
    discountAmount += Number(Number(customDiscountAmount).toFixed(2));
    appliedDiscountDesc += appliedDiscountDesc ? ' + Staff Discount' : 'Staff Discount';
  }

  // Ensure total cannot become negative
  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }
  discountAmount = Number(discountAmount.toFixed(2));

  // 6. Tax Calculation
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  let taxAmount = 0;
  if (pricing.taxRatePercent && pricing.taxRatePercent > 0) {
    taxAmount = Number(((taxableAmount * pricing.taxRatePercent) / 100).toFixed(2));
  }

  // 7. Grand Total
  const grandTotal = Number((taxableAmount + taxAmount).toFixed(2));

  return {
    currency: pricing.currency || 'PHP',
    currencySymbol: pricing.currencySymbol || '₱',
    calculationMeta: {
      isPerSheetProduct: jobType.isPerSheetProduct,
      pagesPerCopy: safePages,
      copies: safeCopies,
      productQuantity: safeProductQty,
      sidesPerSheet,
      physicalSheets,
      totalBillableImpressions,
      unitPrintRate
    },
    lineItems: {
      jobType: {
        id: jobType.id,
        name: jobType.name,
        baseRate: jobType.baseRatePerPage
      },
      paperSize: {
        id: paperSize.id,
        name: paperSize.name,
        surcharge: paperSize.surcharge,
        multiplier: paperSize.multiplier
      },
      paperMaterial: {
        id: material.id,
        name: material.name,
        pricePerSheet: material.pricePerSheet,
        totalMaterialCost: materialCost
      },
      colorMode: {
        id: colorMode.id,
        name: colorMode.name,
        surcharge: colorMode.surchargePerPage
      },
      printSides: {
        id: printSide.id,
        name: printSide.name,
        sidesPerSheet,
        discountFactor: printSide.discountFactor
      },
      finishing: finishingBreakdown
    },
    costs: {
      printingCost,
      materialCost,
      finishingCost,
      setupFee,
      rushFee,
      deliveryFee,
      subtotal,
      discountAmount,
      appliedDiscountDesc,
      taxAmount,
      taxRatePercent: pricing.taxRatePercent || 0,
      grandTotal
    }
  };
}
