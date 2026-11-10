import { IsUUID, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListProjectsQueryDto extends PaginationQueryDto {
  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsUUID()
  ownerId?: string;
}
