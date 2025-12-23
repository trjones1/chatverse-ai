// components/StructuredData.tsx
'use client';

import { useEffect } from 'react';

interface OrganizationSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  logo: string;
  description: string;
  sameAs: string[];
  contactPoint: {
    '@type': string;
    contactType: string;
    email: string;
  };
}

interface WebsiteSchema {
  '@context': string;
  '@type': string;
  name: string;
  url: string;
  description: string;
  potentialAction: {
    '@type': string;
    target: {
      '@type': string;
      urlTemplate: string;
    };
    'query-input': string;
  };
}

interface ProductSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  category: string;
  brand: {
    '@type': string;
    name: string;
  };
  offers: {
    '@type': string;
    price: string;
    priceCurrency: string;
    availability: string;
    validFrom: string;
  };
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
  };
}

interface FAQSchema {
  '@context': string;
  '@type': string;
  mainEntity: Array<{
    '@type': string;
    name: string;
    acceptedAnswer: {
      '@type': string;
      text: string;
    };
  }>;
}

interface BreadcrumbSchema {
  '@context': string;
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item: string;
  }>;
}

interface BlogPostingSchema {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  author: {
    '@type': string;
    name: string;
  };
  publisher: {
    '@type': string;
    name: string;
    logo: {
      '@type': string;
      url: string;
    };
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
  image: string;
  articleSection: string;
  keywords: string[];
}

interface StructuredDataProps {
  type: 'organization' | 'website' | 'product' | 'faq' | 'breadcrumb' | 'blog';
  data: any;
  hostname?: string;
}

export default function StructuredData({ type, data, hostname }: StructuredDataProps) {
  const generateSchema = () => {
    const baseUrl = hostname ? `https://${hostname}` : 'https://chatverse.ai';

    switch (type) {
      case 'organization':
        return {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'ChatVerse',
          url: 'https://chatverse.ai',
          logo: `${baseUrl}/og-chatverse.jpg`,
          description: 'Leading AI girlfriend and virtual companion platform with realistic AI personalities, perfect memory, and NSFW capabilities.',
          sameAs: [
            'https://chatwithlexi.com',
            'https://talktonyx.com'
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'Customer Service',
            email: 'support@chatverse.ai'
          },
          foundingDate: '2024',
          industry: 'Artificial Intelligence',
          numberOfEmployees: '10-50',
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'US'
          }
        } as OrganizationSchema;

      case 'website':
        return {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: data.name || 'ChatVerse - AI Girlfriend Platform',
          url: baseUrl,
          description: data.description || 'Meet your perfect AI girlfriend with ChatVerse. Experience realistic AI companions with perfect memory and unique personalities.',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${baseUrl}/blog?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          },
          publisher: {
            '@type': 'Organization',
            name: 'ChatVerse'
          }
        } as WebsiteSchema;

      case 'product':
        return {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: data.name || 'ChatVerse AI Girlfriend',
          description: data.description || 'Premium AI girlfriend experience with realistic personalities, perfect memory, and NSFW capabilities.',
          category: 'AI Companion Software',
          brand: {
            '@type': 'Brand',
            name: 'ChatVerse'
          },
          offers: {
            '@type': 'Offer',
            price: data.price || '0',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            validFrom: new Date().toISOString().split('T')[0]
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: 4.8,
            reviewCount: 1250
          },
          applicationCategory: 'Entertainment',
          operatingSystem: 'Web Browser'
        } as ProductSchema;

      case 'faq':
        return {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data.questions || [
            {
              '@type': 'Question',
              name: 'What is ChatVerse?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'ChatVerse is a premium AI girlfriend platform featuring unique AI companions with distinct personalities, perfect memory, and realistic conversations. Each character has their own dedicated site for a personalized experience.'
              }
            },
            {
              '@type': 'Question',
              name: 'How is ChatVerse different from other AI girlfriend apps?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'ChatVerse offers individual character sites (like chatwithlexi.com), superior memory systems, multiple unique personalities, and more open NSFW policies compared to platforms like Replika or Character.AI.'
              }
            },
            {
              '@type': 'Question',
              name: 'Is ChatVerse free to use?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'ChatVerse offers free conversations with optional premium features. You can chat with AI girlfriends for free, with VerseCoins available for voice messages and premium experiences.'
              }
            },
            {
              '@type': 'Question',
              name: 'Does ChatVerse support NSFW content?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, ChatVerse supports NSFW conversations for verified adult users. This is available through premium subscriptions with proper age verification.'
              }
            }
          ]
        } as FAQSchema;

      case 'breadcrumb':
        return {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: data.items || []
        } as BreadcrumbSchema;

      case 'blog':
        return {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: data.title,
          description: data.description,
          author: {
            '@type': 'Person',
            name: 'ChatVerse Team'
          },
          publisher: {
            '@type': 'Organization',
            name: 'ChatVerse',
            logo: {
              '@type': 'ImageObject',
              url: `${baseUrl}/og-chatverse.jpg`
            }
          },
          datePublished: data.datePublished,
          dateModified: data.dateModified || data.datePublished,
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': data.url
          },
          image: data.image || `${baseUrl}/og-chatverse.jpg`,
          articleSection: 'AI Companions',
          keywords: data.keywords || ['AI girlfriend', 'virtual companion', 'AI relationship'],
          about: {
            '@type': 'Thing',
            name: 'AI Girlfriend'
          },
          mentions: [
            {
              '@type': 'Thing',
              name: 'Artificial Intelligence'
            },
            {
              '@type': 'Thing',
              name: 'Virtual Relationships'
            }
          ]
        } as BlogPostingSchema;

      default:
        return null;
    }
  };

  useEffect(() => {
    const schema = generateSchema();
    if (schema) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      script.id = `schema-${type}`;

      // Remove existing schema of the same type
      const existing = document.getElementById(`schema-${type}`);
      if (existing) {
        existing.remove();
      }

      document.head.appendChild(script);

      return () => {
        const schemaScript = document.getElementById(`schema-${type}`);
        if (schemaScript) {
          schemaScript.remove();
        }
      };
    }
  }, [type, data, hostname]);

  return null;
}