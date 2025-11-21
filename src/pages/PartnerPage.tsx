import React from 'react';
import { SEO } from '../components/SEO';

export const PartnerPage: React.FC = () => {
    return (
        <div className="partner-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <SEO
                title="合作洽談 - Family Friendly Taiwan"
                description="與Family Friendly Taiwan合作，接觸更多親子族群。提供廣告投放、業配文章、聯盟行銷等合作方案。"
            />

            <h1 style={{ fontSize: '2.5rem', marginBottom: '30px', textAlign: 'center' }}>合作洽談</h1>

            <div className="content-card" style={{ background: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: '#0ea5e9', marginBottom: '20px' }}>為什麼選擇我們？</h2>
                    <p style={{ lineHeight: '1.8', marginBottom: '20px' }}>
                        Family Friendly Taiwan 專注於提供台灣各地最適合親子同遊的景點資訊。我們的讀者群主要為 25-45 歲的父母，正是家庭消費的主力決策者。
                    </p>
                    <ul style={{ lineHeight: '2', paddingLeft: '20px' }}>
                        <li>精準的親子受眾</li>
                        <li>高互動率的社群</li>
                        <li>專業的內容製作</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '40px' }}>
                    <h2 style={{ color: '#0ea5e9', marginBottom: '20px' }}>合作方案</h2>
                    <div className="services-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                        <div className="service-item" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0 }}>廣告投放</h3>
                            <p>網站版位、首頁輪播、精選推薦</p>
                        </div>
                        <div className="service-item" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0 }}>內容行銷</h3>
                            <p>深度開箱文、體驗報導、社群貼文</p>
                        </div>
                        <div className="service-item" style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                            <h3 style={{ marginTop: 0 }}>聯盟行銷</h3>
                            <p>票券銷售分潤、專屬優惠碼</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 style={{ color: '#0ea5e9', marginBottom: '20px' }}>聯絡我們</h2>
                    <p style={{ lineHeight: '1.8' }}>
                        有興趣合作嗎？歡迎來信洽談！<br />
                        Email: <a href="mailto:business@family-friendly-tw.com" style={{ color: '#0ea5e9' }}>business@family-friendly-tw.com</a>
                    </p>
                </section>
            </div>
        </div>
    );
};
