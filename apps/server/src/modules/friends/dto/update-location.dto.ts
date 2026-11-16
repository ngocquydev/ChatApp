import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class UpdateLocationDto {
  @ApiProperty({ description: 'Vĩ độ (-90 đến 90)', example: 10.7769 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Kinh độ (-180 đến 180)', example: 106.7009 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
