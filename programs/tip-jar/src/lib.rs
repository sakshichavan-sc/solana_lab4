use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

declare_id!("DsCjkVs9MHokhCgH1UA24kqnG8Bk1rjeN7SprtLuLyNh");

#[program]
pub mod tip_jar {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let jar = &mut ctx.accounts.jar;
        jar.creator = ctx.accounts.creator.key();
        jar.total_tips = 0;
        jar.tip_count = 0;
        jar.bump = ctx.bumps.jar;
        msg!("Tip Jar initialized");
        Ok(())
    }

    pub fn tip(ctx: Context<Tip>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::InvalidAmount);
        let cpi_accounts = Transfer {
            from: ctx.accounts.tipper.to_account_info(),
            to: ctx.accounts.jar.to_account_info(),
        };
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(), cpi_accounts
        );
        system_program::transfer(cpi_context, amount)?;
        let jar = &mut ctx.accounts.jar;
        jar.total_tips = jar.total_tips.checked_add(amount).ok_or(TipJarError::Overflow)?;
        jar.tip_count = jar.tip_count.checked_add(1).ok_or(TipJarError::Overflow)?;
        msg!("Tip received: {} lamports", amount);
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, TipJarError::InvalidAmount);
        let jar_info = ctx.accounts.jar.to_account_info();
        let minimum_balance = Rent::get()?.minimum_balance(jar_info.data_len());
        let available = jar_info.lamports().saturating_sub(minimum_balance);
        require!(amount <= available, TipJarError::InsufficientFunds);
        let creator_info = ctx.accounts.creator.to_account_info();
        **jar_info.try_borrow_mut_lamports()? -= amount;
        **creator_info.try_borrow_mut_lamports()? += amount;
        let jar = &mut ctx.accounts.jar;
        jar.total_tips = jar.total_tips.checked_sub(amount).ok_or(TipJarError::Overflow)?;
        msg!("Withdrawn: {} lamports", amount);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(init, payer = creator, space = 8 + TipJar::INIT_SPACE,
        seeds = [b"jar", creator.key().as_ref()], bump)]
    pub jar: Account<'info, TipJar>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    #[account(mut)]
    pub tipper: Signer<'info>,
    pub creator: SystemAccount<'info>,
    #[account(mut, seeds = [b"jar", creator.key().as_ref()], bump = jar.bump, has_one = creator)]
    pub jar: Account<'info, TipJar>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut, has_one = creator, seeds = [b"jar", creator.key().as_ref()], bump = jar.bump)]
    pub jar: Account<'info, TipJar>,
}

#[account]
#[derive(InitSpace)]
pub struct TipJar {
    pub creator: Pubkey,
    pub total_tips: u64,
    pub tip_count: u64,
    pub bump: u8,
}

#[error_code]
pub enum TipJarError {
    #[msg("Tip amount must be greater than zero.")]
    InvalidAmount,
    #[msg("Insufficient withdrawable funds.")]
    InsufficientFunds,
    #[msg("Arithmetic overflow or underflow.")]
    Overflow,
}
