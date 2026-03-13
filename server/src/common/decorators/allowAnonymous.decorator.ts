import { CustomDecorator, SetMetadata } from '@nestjs/common';

/**
 * Decorator that marks a route or controller as publicly accessible without authentication.
 * When applied, it sets metadata that allows anonymous users to access the decorated endpoint.
 *
 * @returns {MethodDecorator} A decorator function that sets the 'isPublic' metadata to true.
 *
 * @example
 * ```typescript
 * @Controller('auth')
 * export class AuthController {
 *   @AllowAnonymous()
 *   @Get('login')
 *   login() {
 *     // This endpoint is accessible without authentication
 *   }
 * }
 * ```
 */
export function AllowAnonymous(): CustomDecorator {
  return SetMetadata('isPublic', true);
}
