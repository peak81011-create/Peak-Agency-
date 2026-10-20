import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from "@react-email/components";

// Gabarit unique des e-mails (couleurs reprises des design tokens).
export function EmailLayout({
  locale,
  preview,
  title,
  paragraphs,
  cta,
  footer,
}: {
  locale: string;
  preview: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  footer: string;
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: "#f3f5f0", fontFamily: "Inter, Arial, sans-serif", color: "#19261f", padding: "24px 0" }}>
        <Container style={{ maxWidth: 520, backgroundColor: "#ffffff", border: "1px solid #dce2d5", borderRadius: 14, padding: 28 }}>
          <Text style={{ margin: 0, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#5c685f" }}>
            Peak Clipping Agency
          </Text>
          <Heading as="h1" style={{ fontSize: 22, margin: "8px 0 16px" }}>
            {title}
          </Heading>
          {paragraphs.map((p, i) => (
            <Text key={i} style={{ fontSize: 15, lineHeight: "1.55", margin: "0 0 12px" }}>
              {p}
            </Text>
          ))}
          {cta ? (
            <Section style={{ margin: "20px 0 8px" }}>
              <Button
                href={cta.href}
                style={{ backgroundColor: "#19261f", color: "#ffffff", borderRadius: 6, padding: "12px 18px", fontWeight: 600 }}
              >
                {cta.label}
              </Button>
            </Section>
          ) : null}
          <Hr style={{ borderColor: "#dce2d5", margin: "24px 0 12px" }} />
          <Text style={{ fontSize: 12, color: "#5c685f", margin: 0 }}>{footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
