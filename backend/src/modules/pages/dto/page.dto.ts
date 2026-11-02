import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreatePageDto {
  @IsString({ message: 'Tên trang phải là chuỗi' })
  @IsNotEmpty({ message: 'Tên trang không được để trống' })
  @Length(2, 100, { message: 'Tên trang phải từ 2 đến 100 ký tự' })
  name: string;

  @IsString({ message: 'Slug phải là chuỗi' })
  @IsNotEmpty({ message: 'Đường dẫn (slug) không được để trống' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang',
  })
  slug: string;

  @IsOptional()
  @IsString({ message: 'Tiểu sử phải là chuỗi' })
  @Length(0, 500, { message: 'Tiểu sử tối đa 500 ký tự' })
  bio?: string;

  @IsOptional()
  @IsString({ message: 'Danh mục phải là chuỗi' })
  category?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  bio?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

