import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { ProjectMembersService } from './project-members.service';

@ApiTags('Projects - Members')
@ApiBearerAuth()
@Controller('projects/:id/members')
export class ProjectMembersController {
  constructor(private readonly membersService: ProjectMembersService) {}

  @Get()
  @Roles(Role.pengguna, Role.admin, Role.finance, Role.super_admin)
  @ApiOperation({ summary: 'Melihat daftar anggota proyek' })
  @ApiResponse({ status: 200, description: 'Daftar anggota berhasil dimuat.' })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async findAll(
    @Param('id') projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.membersService.findAll(projectId, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Menambahkan anggota ke dalam proyek' })
  @ApiResponse({ status: 201, description: 'Anggota berhasil ditambahkan.' })
  @ApiResponse({
    status: 400,
    description: 'Pengguna tidak memenuhi syarat atau aturan bisnis dilanggar.',
  })
  @ApiResponse({ status: 404, description: 'Proyek tidak ditemukan.' })
  async addMember(
    @Param('id') projectId: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.membersService.addMember(projectId, dto, user, ip);
  }

  @Delete(':userId')
  @Roles(Role.admin, Role.super_admin)
  @ApiOperation({ summary: 'Mengeluarkan anggota dari proyek' })
  @ApiResponse({
    status: 200,
    description: 'Anggota berhasil dikeluarkan dari proyek.',
  })
  @ApiResponse({
    status: 400,
    description: 'Anggota masih memiliki task yang ditugaskan.',
  })
  @ApiResponse({
    status: 404,
    description: 'Proyek atau anggota tidak ditemukan.',
  })
  async removeMember(
    @Param('id') projectId: string,
    @Param('userId') memberUserId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Ip() ip: string,
  ) {
    return this.membersService.removeMember(projectId, memberUserId, user, ip);
  }
}
