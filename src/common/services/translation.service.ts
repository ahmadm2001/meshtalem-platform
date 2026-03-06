import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async translateArabicToHebrew(text: string): Promise<string> {
    if (!text || text.trim() === '') return '';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'אתה מתרגם מקצועי המתמחה בתרגום תוכן שיווקי מערבית לעברית. תרגם את הטקסט לעברית שיווקית, תקנית וטבעית. החזר רק את הטקסט המתורגם ללא הסברים נוספים.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      });

      return response.choices[0]?.message?.content?.trim() || text;
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      return text; // Fallback: return original text if translation fails
    }
  }

  async translateProductContent(nameAr: string, descriptionAr: string) {
    const [nameHe, descriptionHe] = await Promise.all([
      this.translateArabicToHebrew(nameAr),
      this.translateArabicToHebrew(descriptionAr || ''),
    ]);

    return { nameHe, descriptionHe };
  }
}
