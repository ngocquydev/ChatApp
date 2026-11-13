import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

const PAGE_PHONE_PATTERN = /^(?:|\+?[0-9().\s-]{7,20})$/;

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

  @IsOptional()
  @IsString()
  @Matches(PAGE_PHONE_PATTERN)
  phone?: string;

  @ValidateIf((_object, value: unknown) => value !== '' && value != null)
  @IsEmail()
  @MaxLength(254)
  email?: string;
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

  @IsOptional()
  @IsString()
  @Matches(PAGE_PHONE_PATTERN)
  phone?: string;

  @ValidateIf((_object, value: unknown) => value !== '' && value != null)
  @IsEmail()
  @MaxLength(254)
  email?: string;
}

