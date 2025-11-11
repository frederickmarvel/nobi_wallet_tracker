import { PartialType } from '@nestjs/swagger';
import { CreateWhitelistTokenDto } from './create-whitelist-token.dto';

export class UpdateWhitelistTokenDto extends PartialType(CreateWhitelistTokenDto) {}