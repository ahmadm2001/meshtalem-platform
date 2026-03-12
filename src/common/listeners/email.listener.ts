import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '../services/email.service';
import type { OrderEmailData, StatusEmailData } from '../services/email.service';

@Injectable()
export class EmailListener {
  private readonly logger = new Logger(EmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @OnEvent('order.created', { async: true })
  async handleOrderCreated(data: OrderEmailData) {
    try {
      await this.emailService.sendOrderConfirmation(data);
    } catch (err) {
      this.logger.error('Failed to send order confirmation email', err?.message);
    }
  }

  @OnEvent('order.status.updated', { async: true })
  async handleStatusUpdated(data: StatusEmailData) {
    try {
      await this.emailService.sendStatusUpdate(data);
    } catch (err) {
      this.logger.error('Failed to send status update email', err?.message);
    }
  }
}
