import { Controller, Get } from '@nestjs/common';
import { UserAdminService } from './admin.users.service';
import { createResponse } from 'src/common/helper/response.helper';

@Controller({ path: 'admin/users', version: '1' })
export class UserAdminContoller {
  constructor(
    private readonly userAdminService: UserAdminService
  ){}
  @Get()
  async getAllUsers() {
    const data = await this.userAdminService.getTotalUsers()
    return createResponse.success(data)
  }
}
