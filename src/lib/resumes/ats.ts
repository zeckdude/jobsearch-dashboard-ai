export function checkAtsReadability(generatedPlainText: string, extractedPdfText = generatedPlainText) {
  const requiredSections = ["Summary", "Skills", "Professional Experience"];
  const sectionsDetected = requiredSections.filter((section) => new RegExp(`\\b${section}\\b`, "i").test(extractedPdfText));
  const missingSections = requiredSections.filter((section) => !sectionsDetected.includes(section));
  const contactInfoDetected = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(extractedPdfText);
  const textExtractable = extractedPdfText.trim().length > 200;
  const warnings = [
    ...(!textExtractable ? ["Generated PDF text extraction returned too little text."] : []),
    ...(!contactInfoDetected ? ["Contact email was not detected in extracted text."] : []),
    ...missingSections.map((section) => `${section} section was not detected.`),
  ];

  return {
    textExtractable,
    contactInfoDetected,
    sectionsDetected,
    missingSections,
    extractedTextLength: extractedPdfText.length,
    warnings,
    score: Math.max(0, 100 - warnings.length * 12),
  };
}
