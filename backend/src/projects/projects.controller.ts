import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}
  @Post()
  create(@Body() input: CreateProjectDto) {
    return this.service.create(input);
  }
  @Get()
  findAll(@Query() query: ListProjectsQueryDto) {
    return this.service.findAll(query);
  }
}
